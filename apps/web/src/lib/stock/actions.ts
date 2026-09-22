'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@bloom-kigali/db/client';
import {
  products,
  stockArrivals,
} from '@bloom-kigali/db/schema';
import { stockArrivalSchema } from '@bloom-kigali/validators/stock';
import { requireUser } from '@/lib/auth/session';

function cleanOptional(
  value: string | undefined,
) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function receiveErrorHref(
  productId: string,
  message: string,
) {
  const params = new URLSearchParams();

  if (productId) {
    params.set('product', productId);
  }

  params.set('error', message);

  return `/stock/receive?${params.toString()}`;
}

export async function receiveStockAction(
  formData: FormData,
) {
  const user = await requireUser();

  const rawProductId = String(
    formData.get('productId') || '',
  );

  const parsed = stockArrivalSchema.safeParse({
    productId: rawProductId,
    quantityReceived:
      formData.get('quantityReceived'),
    buyingPrice:
      formData.get('buyingPrice') || '',
    supplierName:
      formData.get('supplierName') ||
      undefined,
    reference:
      formData.get('reference') ||
      undefined,
    notes:
      formData.get('notes') ||
      undefined,
  });

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ||
      'Check the stock form.';

    redirect(
      receiveErrorHref(
        rawProductId,
        message,
      ),
    );
  }

  const [product] = await db
    .select()
    .from(products)
    .where(
      eq(
        products.id,
        parsed.data.productId,
      ),
    )
    .limit(1);

  if (
    !product ||
    product.status !== 'ACTIVE' ||
    product.itemType !== 'PRODUCT'
  ) {
    redirect(
      receiveErrorHref(
        rawProductId,
        'Product was not found.',
      ),
    );
  }

  const supplierName = cleanOptional(
    parsed.data.supplierName,
  );

  const reference = cleanOptional(
    parsed.data.reference,
  );

  const notes = cleanOptional(
    parsed.data.notes,
  );

  await db.transaction(async (tx) => {
    await tx
      .insert(stockArrivals)
      .values({
        productId: product.id,
        receivedByUserId: user.id,
        productName: product.name,
        quantityReceived:
          parsed.data.quantityReceived,
        buyingPrice:
          parsed.data.buyingPrice,
        supplierName,
        batchNumber: null,
        expiryDate: null,
        reference,
        notes,
      });

    await tx
      .update(products)
      .set({
        quantity: sql`
          ${products.quantity}
          + ${parsed.data.quantityReceived}
        `,
        buyingPrice: sql`
          CASE
            WHEN
              ${products.quantity} > 0
              AND ${products.buyingPrice}::numeric > 0
            THEN
              ROUND(
                (
                  (
                    ${products.buyingPrice}::numeric
                    * ${products.quantity}
                  )
                  +
                  (
                    ${parsed.data.buyingPrice}::numeric
                    * ${parsed.data.quantityReceived}
                  )
                )
                /
                NULLIF(
                  (
                    ${products.quantity}
                    + ${parsed.data.quantityReceived}
                  ),
                  0
                ),
                2
              )
            ELSE
              ${parsed.data.buyingPrice}::numeric
          END
        `,
        supplierName:
          supplierName ??
          product.supplierName,
        batchNumber: null,
        expiryDate: null,
        updatedAt: new Date(),
      })
      .where(
        eq(products.id, product.id),
      );
  });

  revalidatePath('/stock');
  revalidatePath('/stock/receive');
  revalidatePath('/products');
  revalidatePath('/sales/new');
  revalidatePath('/dashboard');

  redirect('/stock?received=1');
}
