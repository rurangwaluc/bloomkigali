'use server';

import {
  and,
  eq,
  gt,
  ne,
} from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@bloom-kigali/db/client';
import {
  corrections,
  products,
  saleItems,
  sales,
  stockArrivals,
} from '@bloom-kigali/db/schema';
import {
  requireOwner,
  requireUser,
} from '@/lib/auth/session';

type StockFixValues = {
  quantityReceived: number;
  buyingPrice: number;
  supplierName: string | null;
};

type DbTransaction =
  Parameters<
    Parameters<typeof db.transaction>[0]
  >[0];

class StockFixError extends Error {}

function cleanOptional(value: FormDataEntryValue | null) {
  const cleaned = String(value || '').trim();
  return cleaned || null;
}

function fixErrorHref(
  receiptId: string,
  message: string,
) {
  return `/stock/received/${receiptId}/fix?error=${encodeURIComponent(message)}`;
}

function requestsErrorHref(message: string) {
  return `/requests?error=${encodeURIComponent(message)}`;
}

function parseFormValues(
  formData: FormData,
):
  | {
      values: StockFixValues;
      reason: string;
    }
  | {
      error: string;
    } {
  const quantityReceived = Number(
    String(
      formData.get('quantityReceived') || '',
    ).trim(),
  );

  const buyingPrice = Number(
    String(
      formData.get('buyingPrice') || '',
    ).trim(),
  );

  const supplierName = cleanOptional(
    formData.get('supplierName'),
  );

  const reason = String(
    formData.get('reason') || '',
  ).trim();

  if (
    !Number.isInteger(quantityReceived) ||
    quantityReceived < 0
  ) {
    return {
      error:
        'Enter a valid quantity received.',
    };
  }

  if (
    !Number.isFinite(buyingPrice) ||
    buyingPrice <= 0
  ) {
    return {
      error:
        'Enter a valid buying price.',
    };
  }

  if (reason.length < 3) {
    return {
      error:
        'Tell us what was entered wrong.',
    };
  }

  return {
    values: {
      quantityReceived,
      buyingPrice,
      supplierName,
    },
    reason,
  };
}

function snapshotToValues(
  value: Record<string, unknown>,
): StockFixValues {
  const quantityReceived = Number(
    value.quantityReceived,
  );

  const buyingPrice = Number(
    value.buyingPrice,
  );

  const supplierName =
    typeof value.supplierName === 'string' &&
    value.supplierName.trim()
      ? value.supplierName.trim()
      : null;

  if (
    !Number.isInteger(quantityReceived) ||
    quantityReceived < 0 ||
    !Number.isFinite(buyingPrice) ||
    buyingPrice <= 0
  ) {
    throw new StockFixError(
      'This request has invalid stock details.',
    );
  }

  return {
    quantityReceived,
    buyingPrice,
    supplierName,
  };
}

function sameValues(
  first: StockFixValues,
  second: StockFixValues,
) {
  return (
    first.quantityReceived ===
      second.quantityReceived &&
    first.buyingPrice ===
      second.buyingPrice &&
    first.supplierName ===
      second.supplierName
  );
}

async function applyStockReceiptFix(
  tx: DbTransaction,
  receiptId: string,
  expectedBefore: StockFixValues,
  after: StockFixValues,
) {
  const [receipt] = await tx
    .select({
      id: stockArrivals.id,
      productId: stockArrivals.productId,
      productName:
        stockArrivals.productName,
      quantityReceived:
        stockArrivals.quantityReceived,
      buyingPrice:
        stockArrivals.buyingPrice,
      supplierName:
        stockArrivals.supplierName,
      arrivedAt:
        stockArrivals.arrivedAt,

      currentQuantity:
        products.quantity,
      currentBuyingPrice:
        products.buyingPrice,
      currentSupplierName:
        products.supplierName,
    })
    .from(stockArrivals)
    .innerJoin(
      products,
      eq(
        stockArrivals.productId,
        products.id,
      ),
    )
    .where(
      eq(stockArrivals.id, receiptId),
    )
    .limit(1);

  if (!receipt) {
    throw new StockFixError(
      'This stock entry was not found.',
    );
  }

  const before: StockFixValues = {
    quantityReceived:
      receipt.quantityReceived,
    buyingPrice: Number(
      receipt.buyingPrice,
    ),
    supplierName:
      receipt.supplierName?.trim() ||
      null,
  };

  if (!sameValues(before, expectedBefore)) {
    throw new StockFixError(
      'This stock entry has already changed. Open it again before making another fix.',
    );
  }

  if (sameValues(before, after)) {
    throw new StockFixError(
      'Nothing was changed.',
    );
  }

  /*
   * A saved receipt can safely be rewritten only
   * while nothing later has used that product.
   *
   * This protects stock totals and buying-cost
   * calculations from silent historical damage.
   */
  const [
    laterArrival,
    laterSale,
  ] = await Promise.all([
    tx
      .select({
        id: stockArrivals.id,
      })
      .from(stockArrivals)
      .where(
        and(
          eq(
            stockArrivals.productId,
            receipt.productId,
          ),
          ne(
            stockArrivals.id,
            receipt.id,
          ),
          gt(
            stockArrivals.arrivedAt,
            receipt.arrivedAt,
          ),
        ),
      )
      .limit(1),

    tx
      .select({
        id: saleItems.id,
      })
      .from(saleItems)
      .innerJoin(
        sales,
        eq(
          saleItems.saleId,
          sales.id,
        ),
      )
      .where(
        and(
          eq(
            saleItems.productId,
            receipt.productId,
          ),
          gt(
            sales.saleDate,
            receipt.arrivedAt,
          ),
        ),
      )
      .limit(1),
  ]);

  if (
    laterArrival.length > 0 ||
    laterSale.length > 0
  ) {
    throw new StockFixError(
      'This stock entry has already been followed by more stock or sales, so it cannot be safely changed here.',
    );
  }

  const currentQuantity =
    receipt.currentQuantity;

  const currentBuyingPrice =
    Number(
      receipt.currentBuyingPrice,
    );

  const oldQuantity =
    before.quantityReceived;

  const oldBuyingPrice =
    before.buyingPrice;

  const quantityBeforeReceipt =
    currentQuantity - oldQuantity;

  if (quantityBeforeReceipt < 0) {
    throw new StockFixError(
      'The current stock no longer matches this entry.',
    );
  }

  const valueBeforeReceipt = Math.max(
    0,
    currentBuyingPrice *
      currentQuantity -
      oldBuyingPrice *
        oldQuantity,
  );

  const newCurrentQuantity =
    quantityBeforeReceipt +
    after.quantityReceived;

  const newStockValue =
    valueBeforeReceipt +
    after.buyingPrice *
      after.quantityReceived;

  const newBuyingPrice =
    newCurrentQuantity > 0
      ? Number(
          (
            newStockValue /
            newCurrentQuantity
          ).toFixed(2),
        )
      : 0;

  await tx
    .update(stockArrivals)
    .set({
      quantityReceived:
        after.quantityReceived,
      buyingPrice:
        after.buyingPrice.toFixed(2),
      supplierName:
        after.supplierName,
    })
    .where(
      eq(
        stockArrivals.id,
        receipt.id,
      ),
    );

  await tx
    .update(products)
    .set({
      quantity:
        newCurrentQuantity,
      buyingPrice:
        newBuyingPrice.toFixed(2),

      supplierName:
        after.supplierName ??
        receipt.currentSupplierName,

      updatedAt: new Date(),
    })
    .where(
      eq(
        products.id,
        receipt.productId,
      ),
    );

  return {
    targetLabel:
      receipt.productName,
    before,
  };
}

async function getCurrentReceipt(
  receiptId: string,
) {
  const [receipt] = await db
    .select({
      id: stockArrivals.id,
      productName:
        stockArrivals.productName,
      quantityReceived:
        stockArrivals.quantityReceived,
      buyingPrice:
        stockArrivals.buyingPrice,
      supplierName:
        stockArrivals.supplierName,
    })
    .from(stockArrivals)
    .where(
      eq(stockArrivals.id, receiptId),
    )
    .limit(1);

  return receipt || null;
}

function revalidateStockFixPaths() {
  revalidatePath('/stock');
  revalidatePath('/products');
  revalidatePath('/sales/new');
  revalidatePath('/dashboard');
  revalidatePath('/requests');
}

export async function submitStockFixAction(
  formData: FormData,
) {
  const user = await requireUser();

  const receiptId = String(
    formData.get('receiptId') || '',
  ).trim();

  if (!receiptId) {
    redirect('/stock');
  }

  const parsed =
    parseFormValues(formData);

  if ('error' in parsed) {
    redirect(
      fixErrorHref(
        receiptId,
        parsed.error,
      ),
    );
  }

  const receipt =
    await getCurrentReceipt(
      receiptId,
    );

  if (!receipt) {
    redirect(
      fixErrorHref(
        receiptId,
        'This stock entry was not found.',
      ),
    );
  }

  const before: StockFixValues = {
    quantityReceived:
      receipt.quantityReceived,
    buyingPrice:
      Number(receipt.buyingPrice),
    supplierName:
      receipt.supplierName?.trim() ||
      null,
  };

  if (
    sameValues(
      before,
      parsed.values,
    )
  ) {
    redirect(
      fixErrorHref(
        receiptId,
        'Nothing was changed.',
      ),
    );
  }

  if (user.role === 'EMPLOYEE') {
    const [existingRequest] =
      await db
        .select({
          id: corrections.id,
        })
        .from(corrections)
        .where(
          and(
            eq(
              corrections.targetType,
              'STOCK_RECEIPT',
            ),
            eq(
              corrections.targetId,
              receiptId,
            ),
            eq(
              corrections.status,
              'PENDING',
            ),
          ),
        )
        .limit(1);

    if (existingRequest) {
      redirect(
        fixErrorHref(
          receiptId,
          'A request for this stock entry is already waiting for the owner.',
        ),
      );
    }

    await db
      .insert(corrections)
      .values({
        targetType:
          'STOCK_RECEIPT',
        targetId: receiptId,
        targetLabel:
          receipt.productName,

        requestedByUserId:
          user.id,

        status: 'PENDING',

        beforeValues: before,
        afterValues:
          parsed.values,

        reason:
          parsed.reason,
      });

    revalidateStockFixPaths();

    redirect(
      '/stock?request=1',
    );
  }

  try {
    await db.transaction(
      async (tx) => {
        const applied =
          await applyStockReceiptFix(
            tx,
            receiptId,
            before,
            parsed.values,
          );

        const now = new Date();

        await tx
          .insert(corrections)
          .values({
            targetType:
              'STOCK_RECEIPT',
            targetId:
              receiptId,
            targetLabel:
              applied.targetLabel,

            requestedByUserId:
              user.id,
            reviewedByUserId:
              user.id,

            status: 'APPLIED',

            beforeValues:
              applied.before,
            afterValues:
              parsed.values,

            reason:
              parsed.reason,

            reviewedAt: now,
            appliedAt: now,
          });
      },
    );
  } catch (error) {
    if (
      error instanceof
      StockFixError
    ) {
      redirect(
        fixErrorHref(
          receiptId,
          error.message,
        ),
      );
    }

    throw error;
  }

  revalidateStockFixPaths();

  redirect('/stock?fixed=1');
}

export async function approveStockFixRequestAction(
  formData: FormData,
) {
  const owner =
    await requireOwner();

  const correctionId = String(
    formData.get('correctionId') ||
      '',
  ).trim();

  if (!correctionId) {
    redirect(
      requestsErrorHref(
        'Request was not found.',
      ),
    );
  }

  const [request] = await db
    .select()
    .from(corrections)
    .where(
      and(
        eq(
          corrections.id,
          correctionId,
        ),
        eq(
          corrections.status,
          'PENDING',
        ),
      ),
    )
    .limit(1);

  if (
    !request ||
    request.targetType !==
      'STOCK_RECEIPT'
  ) {
    redirect(
      requestsErrorHref(
        'Request was not found.',
      ),
    );
  }

  let before: StockFixValues;
  let after: StockFixValues;

  try {
    before = snapshotToValues(
      request.beforeValues,
    );

    after = snapshotToValues(
      request.afterValues,
    );
  } catch (error) {
    if (
      error instanceof
      StockFixError
    ) {
      redirect(
        requestsErrorHref(
          error.message,
        ),
      );
    }

    throw error;
  }

  try {
    await db.transaction(
      async (tx) => {
        await applyStockReceiptFix(
          tx,
          request.targetId,
          before,
          after,
        );

        const now = new Date();

        await tx
          .update(corrections)
          .set({
            status: 'APPLIED',
            reviewedByUserId:
              owner.id,
            reviewedAt: now,
            appliedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(
                corrections.id,
                request.id,
              ),
              eq(
                corrections.status,
                'PENDING',
              ),
            ),
          );
      },
    );
  } catch (error) {
    if (
      error instanceof
      StockFixError
    ) {
      redirect(
        requestsErrorHref(
          error.message,
        ),
      );
    }

    throw error;
  }

  revalidateStockFixPaths();

  redirect(
    '/requests?approved=1',
  );
}

export async function rejectStockFixRequestAction(
  formData: FormData,
) {
  const owner =
    await requireOwner();

  const correctionId = String(
    formData.get('correctionId') ||
      '',
  ).trim();

  if (!correctionId) {
    redirect(
      requestsErrorHref(
        'Request was not found.',
      ),
    );
  }

  const now = new Date();

  const rejected = await db
    .update(corrections)
    .set({
      status: 'REJECTED',
      reviewedByUserId:
        owner.id,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(
          corrections.id,
          correctionId,
        ),
        eq(
          corrections.status,
          'PENDING',
        ),
      ),
    )
    .returning({
      id: corrections.id,
    });

  if (rejected.length === 0) {
    redirect(
      requestsErrorHref(
        'Request was not found.',
      ),
    );
  }

  revalidatePath('/requests');

  redirect(
    '/requests?rejected=1',
  );
}
