'use server';

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@bloom-kigali/db/client';
import {
  cashDrawerMovements,
  cashDrawers,
  customers,
  products,
  saleItems,
  salePayments,
  sales,
} from '@bloom-kigali/db/schema';
import { saleFormSchema } from '@bloom-kigali/validators/sale';
import { requireUser } from '@/lib/auth/session';

export type SaleState = {
  error?: string;
};

type SaleLine = {
  item: typeof products.$inferSelect;
  quantity: number;
  baseUnitPrice: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
  profitAmount: number;
};

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function toMoney(value: number) {
  return value.toFixed(2);
}

function moneyNumber(value: string | number | null | undefined) {
  return Number(value || 0);
}

function getProductSellingPrice(item: typeof products.$inferSelect) {
  return moneyNumber(item.sellingPrice);
}

function getProductCost(item: typeof products.$inferSelect) {
  return moneyNumber(item.buyingPrice);
}

function getLinePrice(
  item: typeof products.$inferSelect,
  line: { unitPrice?: string },
) {
  const enteredPrice =
    moneyNumber(
      line.unitPrice,
    );

  if (item.itemType === 'SERVICE') {
    return enteredPrice;
  }

  const normalPrice =
    getProductSellingPrice(
      item,
    );

  return enteredPrice > 0
    ? enteredPrice
    : normalPrice;
}

function validateProductPrice(item: typeof products.$inferSelect) {
  if (item.itemType === 'SERVICE') {
    return;
  }

  if (getProductSellingPrice(item) <= 0) {
    throw new Error(`${item.name} does not have a selling price.`);
  }
}

function validatePayment({
  totalAmount,
  amountReceived,
  changeReturned,
  extraKept,
  extraReason,
}: {
  totalAmount: number;
  amountReceived: number;
  changeReturned: number;
  extraKept: number;
  extraReason: string | null;
}) {
  if (amountReceived < 0 || changeReturned < 0 || extraKept < 0) {
    throw new Error('Money amounts cannot be below zero.');
  }

  const paidAmount = amountReceived - changeReturned - extraKept;

  if (paidAmount < 0) {
    throw new Error('Returned money and extra kept cannot be more than amount received.');
  }

  if (paidAmount > totalAmount) {
    throw new Error('Choose how much was returned or how much extra was kept.');
  }

  const balanceAmount = totalAmount - paidAmount;

  if ((changeReturned > 0 || extraKept > 0) && balanceAmount > 0) {
    throw new Error('Only record change or extra kept when the sale is fully paid.');
  }

  if (amountReceived > totalAmount) {
    const overAmount = amountReceived - totalAmount;
    const allocatedOverAmount = changeReturned + extraKept;

    if (Number(allocatedOverAmount.toFixed(2)) !== Number(overAmount.toFixed(2))) {
      throw new Error('Account for all extra money between returned money and extra kept.');
    }
  }

  if (extraKept > 0 && !extraReason) {
    throw new Error('Explain why extra customer money was kept.');
  }

  return {
    paidAmount,
    balanceAmount,
  };
}

function applyDiscountToProfit(
  lines: SaleLine[],
  discountAmount: number,
) {
  if (discountAmount <= 0) {
    return lines;
  }

  const subtotalAmount =
    lines.reduce(
      (sum, line) =>
        sum +
        line.lineTotal,
      0,
    );

  if (subtotalAmount <= 0) {
    return lines;
  }

  const subtotalCents =
    Math.round(
      subtotalAmount * 100,
    );

  const discountCents =
    Math.round(
      discountAmount * 100,
    );

  let allocatedCents = 0;

  return lines.map(
    (line, index) => {
      const isLast =
        index ===
        lines.length - 1;

      let lineDiscountCents: number;

      if (isLast) {
        lineDiscountCents =
          discountCents -
          allocatedCents;
      } else {
        const lineTotalCents =
          Math.round(
            line.lineTotal *
              100,
          );

        const proportional =
          Math.round(
            (discountCents *
              lineTotalCents) /
              subtotalCents,
          );

        lineDiscountCents =
          Math.max(
            0,
            Math.min(
              proportional,
              discountCents -
                allocatedCents,
            ),
          );
      }

      allocatedCents +=
        lineDiscountCents;

      const lineDiscount =
        lineDiscountCents /
        100;

      return {
        ...line,
        profitAmount:
          line.profitAmount -
          lineDiscount,
      };
    },
  );
}

export async function createSaleAction(
  _previousState: SaleState,
  formData: FormData,
): Promise<SaleState> {
  const user = await requireUser();

  let items: unknown = [];

  try {
    items = JSON.parse(String(formData.get('itemsJson') || '[]'));
  } catch {
    return {
      error: 'Check the selected items.',
    };
  }

  const parsed = saleFormSchema.safeParse({
    customerMode: formData.get('customerMode'),
    customerId: formData.get('customerId') || undefined,
    newCustomerName: formData.get('newCustomerName') || undefined,
    newCustomerPhone: formData.get('newCustomerPhone') || undefined,
    paymentMethod: formData.get('paymentMethod'),
    discountAmount: formData.get('discountAmount') || '0',
    discountReason: formData.get('discountReason') || undefined,
    amountReceived: formData.get('amountReceived') || '0',
    changeReturned: formData.get('changeReturned') || '0',
    extraKept: formData.get('extraKept') || '0',
    extraReason: formData.get('extraReason') || undefined,
    notes: formData.get('notes') || undefined,
    items,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Check the sale form.',
    };
  }

  if (parsed.data.customerMode === 'EXISTING' && !parsed.data.customerId) {
    return {
      error: 'Choose an existing customer or use walk-in customer.',
    };
  }

  if (parsed.data.customerMode === 'NEW' && !cleanOptional(parsed.data.newCustomerName)) {
    return {
      error: 'Enter the new customer name.',
    };
  }

  const uniqueIds = [...new Set(parsed.data.items.map((item) => item.productId))];
  const sellableItems =
    uniqueIds.length > 0
      ? await db
          .select()
          .from(products)
          .where(
            and(
              inArray(
                products.id,
                uniqueIds,
              ),
              eq(
                products.itemType,
                'PRODUCT',
              ),
            ),
          )
      : [];

  if (sellableItems.length !== uniqueIds.length) {
    return {
      error: 'One item was not found.',
    };
  }

  try {
    const lines: SaleLine[] = parsed.data.items.map((line) => {
      const item = sellableItems.find((current) => current.id === line.productId);

      if (!item || item.status !== 'ACTIVE') {
        throw new Error('One item is not available.');
      }

      validateProductPrice(item);

      const baseUnitPrice =
        getProductSellingPrice(
          item,
        );

      const unitPrice =
        getLinePrice(
          item,
          {
            unitPrice:
              line.unitPrice,
          },
        );

      if (unitPrice <= 0) {
        throw new Error(
          `Enter the price for ${item.name}.`,
        );
      }

      /*
       * Lower negotiated prices must use the existing
       * Discount flow so the reduction and reason stay
       * visible in the sale history.
       */
      if (
        item.itemType === 'PRODUCT' &&
        Number(
          unitPrice.toFixed(2),
        ) <
          Number(
            baseUnitPrice.toFixed(2),
          )
      ) {
        throw new Error(
          `Use Add discount to sell ${item.name} below its normal price.`,
        );
      }

      const unitCost =
        item.itemType === 'PRODUCT'
          ? getProductCost(
              item,
            )
          : 0;

      const lineTotal =
        unitPrice *
        line.quantity;

      const profitAmount =
        (unitPrice -
          unitCost) *
        line.quantity;

      return {
        item,
        quantity:
          line.quantity,
        baseUnitPrice,
        unitPrice,
        unitCost,
        lineTotal,
        profitAmount,
      };
    });

    const quantityByProduct = new Map<string, number>();

    for (const line of lines) {
      if (line.item.itemType !== 'PRODUCT') {
        continue;
      }

      quantityByProduct.set(line.item.id, (quantityByProduct.get(line.item.id) || 0) + line.quantity);
    }

    for (const [productId, quantity] of quantityByProduct.entries()) {
      const item = sellableItems.find((current) => current.id === productId);

      if (!item) {
        throw new Error('One item was not found.');
      }

      if (item.quantity < quantity) {
        throw new Error(`${item.name} does not have enough stock.`);
      }
    }

    const subtotalAmount =
      lines.reduce(
        (sum, line) =>
          sum +
          line.lineTotal,
        0,
      );

    const discountAmount =
      moneyNumber(
        parsed.data
          .discountAmount,
      );

    const discountReason =
      cleanOptional(
        parsed.data
          .discountReason,
      );

    if (discountAmount < 0) {
      throw new Error(
        'Discount cannot be below zero.',
      );
    }

    if (
      discountAmount >
      subtotalAmount
    ) {
      throw new Error(
        'Discount cannot be more than the sale subtotal.',
      );
    }

    if (
      discountAmount > 0 &&
      !discountReason
    ) {
      throw new Error(
        'Enter why the discount was given.',
      );
    }

    const totalAmount =
      Number(
        (
          subtotalAmount -
          discountAmount
        ).toFixed(2),
      );

    const discountedLines =
      applyDiscountToProfit(
        lines,
        discountAmount,
      );

    const amountReceived = moneyNumber(parsed.data.amountReceived);
    const changeReturned = moneyNumber(parsed.data.changeReturned);
    const extraKept = moneyNumber(parsed.data.extraKept);
    const extraReason = cleanOptional(
      parsed.data.extraReason,
    );

    const { paidAmount, balanceAmount } = validatePayment({
      totalAmount,
      amountReceived,
      changeReturned,
      extraKept,
      extraReason,
    });

    if (balanceAmount > 0 && parsed.data.customerMode === 'WALK_IN') {
      throw new Error('Choose or save the customer before giving credit.');
    }

    await db.transaction(async (tx) => {
      let customerId: string | null = null;
      let customerName: string | null = null;
      let customerPhone: string | null = null;

      if (parsed.data.customerMode === 'EXISTING' && parsed.data.customerId) {
        const [customer] = await tx
          .select()
          .from(customers)
          .where(eq(customers.id, parsed.data.customerId))
          .limit(1);

        if (!customer || customer.status !== 'ACTIVE') {
          throw new Error('Selected customer was not found.');
        }

        customerId = customer.id;
        customerName = customer.name;
        customerPhone = customer.phone;
      }

      if (parsed.data.customerMode === 'NEW') {
        const [customer] = await tx
          .insert(customers)
          .values({
            name: cleanOptional(parsed.data.newCustomerName) || 'Customer',
            phone: cleanOptional(parsed.data.newCustomerPhone),
          })
          .returning({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
          });

        customerId = customer.id;
        customerName = customer.name;
        customerPhone = customer.phone;
      }

      let openDrawer: typeof cashDrawers.$inferSelect | undefined;

      if (parsed.data.paymentMethod === 'CASH' && (paidAmount > 0 || extraKept > 0)) {
        const [drawer] = await tx
          .select()
          .from(cashDrawers)
          .where(eq(cashDrawers.status, 'OPEN'))
          .orderBy(desc(cashDrawers.openedAt))
          .limit(1);

        if (!drawer) {
          throw new Error('Open the cash drawer before saving a cash sale.');
        }

        openDrawer = drawer;
      }

      const [sale] = await tx
        .insert(sales)
        .values({
          customerId,
          customerName,
          customerPhone,
          paymentMethod: parsed.data.paymentMethod,
          subtotalAmount: toMoney(subtotalAmount),
          discountAmount: toMoney(discountAmount),
          discountReason:
            discountAmount > 0
              ? discountReason
              : null,
          discountGivenByUserId:
            discountAmount > 0
              ? user.id
              : null,
          totalAmount: toMoney(totalAmount),
          paidAmount: toMoney(paidAmount),
          amountReceived: toMoney(amountReceived),
          changeReturned: toMoney(changeReturned),
          extraKept: toMoney(extraKept),
          balanceAmount: toMoney(balanceAmount),
          extraReason,
          notes: cleanOptional(parsed.data.notes),
        })
        .returning({
          id: sales.id,
          saleDate: sales.saleDate,
          createdAt: sales.createdAt,
        });

      /*
       * Permanent payment history.
       *
       * A fully unpaid sale has no payment event yet,
       * so do not create a zero-money ledger row.
       */
      if (amountReceived > 0) {
        await tx
          .insert(salePayments)
          .values({
            saleId: sale.id,
            receivedByUserId:
              user.id,
            paymentType:
              'AT_SALE',
            paymentMethod:
              parsed.data
                .paymentMethod,
            receivedAmount:
              toMoney(
                amountReceived,
              ),
            appliedAmount:
              toMoney(
                paidAmount,
              ),
            returnedAmount:
              toMoney(
                changeReturned,
              ),
            returnMethod:
              changeReturned > 0
                ? parsed.data
                    .paymentMethod
                : null,
            extraKeptAmount:
              toMoney(
                extraKept,
              ),
            extraReason:
              extraKept > 0
                ? extraReason
                : null,
            paidAt:
              sale.saleDate,
            createdAt:
              sale.createdAt,
          });
      }

      await tx.insert(saleItems).values(
        discountedLines.map((line) => ({
          saleId: sale.id,
          productId: line.item.id,
          itemName: line.item.name,
          itemType: line.item.itemType,
          quantity: line.quantity,
          baseUnitPrice:
            toMoney(
              line.baseUnitPrice,
            ),
          unitPrice:
            toMoney(
              line.unitPrice,
            ),
          priceAdjustedByUserId:
            line.unitPrice >
            line.baseUnitPrice
              ? user.id
              : null,
          unitCost: toMoney(line.unitCost),
          lineTotal: toMoney(line.lineTotal),
          profitAmount: toMoney(line.profitAmount),
        })),
      );

      if (openDrawer && paidAmount > 0) {
        await tx.insert(cashDrawerMovements).values({
          drawerId: openDrawer.id,
          createdByUserId: user.id,
          movementType: 'CASH_SALE',
          direction: 'IN',
          amount: toMoney(paidAmount),
          reason: customerName ? `Cash sale / ${customerName}` : 'Cash sale / Walk-in customer',
          saleId: sale.id,
        });
      }

      if (openDrawer && extraKept > 0) {
        await tx.insert(cashDrawerMovements).values({
          drawerId: openDrawer.id,
          createdByUserId: user.id,
          movementType: 'CUSTOMER_EXTRA_KEPT',
          direction: 'IN',
          amount: toMoney(extraKept),
          reason: extraReason || 'Customer extra kept',
          saleId: sale.id,
        });
      }

      for (const line of lines) {
        if (line.item.itemType === 'PRODUCT') {
          await tx
            .update(products)
            .set({
              quantity: sql`${products.quantity} - ${line.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, line.item.id));
        }
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Sale could not be saved.',
    };
  }

  revalidatePath('/sales');
  revalidatePath('/money');
  revalidatePath('/customers');
  revalidatePath('/products');
  revalidatePath('/stock');
  revalidatePath('/dashboard');
  revalidatePath('/reports');

  redirect('/sales');
}
