import Link from 'next/link';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@bloom-kigali/db/client';
import {
  cashDrawerMovements,
  cashDrawers,
  salePayments,
  expenses,
  products,
  saleItems,
  sales,
} from '@bloom-kigali/db/schema';
import { requireUser } from '@/lib/auth/session';
import { getExpectedDrawerCash } from '@/lib/cash-drawer/calculations';

const KIGALI_TIME_ZONE = 'Africa/Kigali';

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

function kigaliDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KIGALI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function isToday(value: Date) {
  return kigaliDateKey(value) === kigaliDateKey(new Date());
}

function todayLabel() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: KIGALI_TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function timeLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: KIGALI_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function paymentName(value: string) {
  const names: Record<string, string> = {
    CASH: 'Cash',
    MOBILE_MONEY: 'Mobile money',
    BANK: 'Bank',
    CARD: 'Card',
  };

  return names[value] || value.replaceAll('_', ' ');
}

export default async function DashboardPage() {
  const user = await requireUser();
  const isOwner = user.role === 'OWNER';

  const [
    saleList,
    productList,
    expenseList,
    paymentList,
    currentDrawer,
  ] = await Promise.all([
    db.select().from(sales).orderBy(desc(sales.saleDate)),
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(expenses).orderBy(desc(expenses.expenseDate)),
    db
      .select()
      .from(salePayments)
      .where(
        eq(
          salePayments.isActive,
          true,
        ),
      )
      .orderBy(
        desc(
          salePayments.paidAt,
        ),
      ),
    db.query.cashDrawers.findFirst({
      where: eq(cashDrawers.status, 'OPEN'),
      orderBy: desc(cashDrawers.openedAt),
    }),
  ]);

  const currentMovements = currentDrawer
    ? await db
        .select()
        .from(cashDrawerMovements)
        .where(eq(cashDrawerMovements.drawerId, currentDrawer.id))
        .orderBy(desc(cashDrawerMovements.createdAt))
    : [];

  const todaySales = saleList.filter((sale) =>
    isToday(sale.saleDate),
  );

  const todaySaleIds = todaySales.map((sale) => sale.id);

  const todaySaleItems =
    todaySaleIds.length > 0
      ? await db
          .select()
          .from(saleItems)
          .where(inArray(saleItems.saleId, todaySaleIds))
      : [];

  const activeProducts = productList.filter(
    (product) =>
      product.status === 'ACTIVE' &&
      product.itemType === 'PRODUCT',
  );

  const lowStockProducts = activeProducts
    .filter(
      (product) => product.quantity <= product.minQuantity,
    )
    .sort((a, b) => a.quantity - b.quantity);

  const unpaidSales = saleList
    .filter((sale) => Number(sale.balanceAmount) > 0)
    .sort(
      (a, b) =>
        Number(b.balanceAmount) - Number(a.balanceAmount),
    );

  const todayExpenses = expenseList.filter((expense) =>
    isToday(expense.expenseDate),
  );

  const todayPayments =
    paymentList.filter(
      (payment) =>
        isToday(
          payment.paidAt,
        ),
    );

  const todaySalesTotal =
    todaySales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.totalAmount,
        ),
      0,
    );

  /*
   * Received means customer money that actually
   * remained with the business today:
   *
   * received - returned/refunded.
   *
   * Extra intentionally kept therefore remains
   * real money received, but does not change
   * the sale's product revenue or profit.
   */
  const todayMoneyReceived =
    todayPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.receivedAmount,
        ) -
        Number(
          payment.returnedAmount,
        ),
      0,
    );

  const todayLaterMoney =
    todayPayments
      .filter(
        (payment) =>
          payment.paymentType ===
          'LATER_PAYMENT',
      )
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.receivedAmount,
          ) -
          Number(
            payment.returnedAmount,
          ),
        0,
      );

  const todayExpensesTotal = todayExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  const todayGrossProfit = todaySaleItems.reduce(
    (sum, item) => sum + Number(item.profitAmount || 0),
    0,
  );

  const todayNetProfit =
    todayGrossProfit - todayExpensesTotal;

  const expectedCash = currentDrawer
    ? getExpectedDrawerCash(
        currentDrawer,
        currentMovements,
      )
    : 0;

  const ownerSummary = [
    {
      label: 'Sales',
      value: money(todaySalesTotal),
      helper: plural(todaySales.length, 'sale'),
    },
    {
      label: 'Received',
      value: money(todayMoneyReceived),
      helper:
        todayLaterMoney > 0
          ? 'Sales + later payments today'
          : 'Money received today',
    },
    {
      label: 'Expenses',
      value: money(todayExpensesTotal),
      helper: 'Spent today',
    },
    {
      label: 'Net profit',
      value: money(todayNetProfit),
      helper: 'After today’s expenses',
      negative: todayNetProfit < 0,
    },
  ];

  const staffSummary = [
    {
      label: 'Sales today',
      value: plural(todaySales.length, 'sale'),
      helper: 'Recorded today',
    },
    {
      label: 'Low stock',
      value: plural(lowStockProducts.length, 'item'),
      helper: 'Needs restocking',
    },
    {
      label: 'Products',
      value: plural(activeProducts.length, 'item'),
      helper: 'Active products',
    },
    {
      label: 'Unpaid sales',
      value: plural(unpaidSales.length, 'sale'),
      helper: 'Customers to follow',
    },
  ];

  const summary = isOwner ? ownerSummary : staffSummary;
  const recentSales = todaySales.slice(0, 6);

  const hasAttention =
    lowStockProducts.length > 0 ||
    unpaidSales.length > 0;

  return (
    <section className="space-y-4 sm:space-y-5">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Today
            </p>

            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {todayLabel()}
            </p>
          </div>

          <Link
            href="/sales/new"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)]"
          >
            New sale
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="grid grid-cols-2 xl:grid-cols-4">
            {summary.map((item, index) => (
              <div
                key={item.label}
                className={[
                  'px-5 py-5 sm:px-6 sm:py-5',
                  index % 2 === 0
                    ? 'border-r border-[var(--border)]'
                    : '',
                  index < 2
                    ? 'border-b border-[var(--border)] xl:border-b-0'
                    : '',
                  index > 0
                    ? 'xl:border-l xl:border-[var(--border)]'
                    : '',
                  index === 2
                    ? 'border-r border-[var(--border)]'
                    : '',
                ].join(' ')}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                  {item.label}
                </p>

                <p
                  className={
                    'negative' in item && item.negative
                      ? 'mt-2 text-2xl font-black tracking-tight text-[var(--danger)]'
                      : 'mt-2 text-2xl font-black tracking-tight text-[var(--text)]'
                  }
                >
                  {item.value}
                </p>

                <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                  {item.helper}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                Money
              </p>

              <h2 className="mt-1 text-lg font-black text-[var(--text)]">
                Cash drawer
              </h2>
            </div>

            {currentDrawer ? (
              <Link
                href="/money"
                className="text-xs font-black text-[var(--primary)] hover:text-[var(--primary-strong)]"
              >
                View
              </Link>
            ) : null}
          </div>

          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {currentDrawer ? (
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-xs font-bold text-[var(--muted)]">
                    Expected cash
                  </p>

                  <p className="mt-1 text-2xl font-black tracking-tight text-[var(--text)]">
                    {money(expectedCash)}
                  </p>

                  <p className="mt-1.5 text-xs font-bold text-[var(--muted)]">
                    Opened {timeLabel(currentDrawer.openedAt)}
                  </p>
                </div>

                <span className="text-sm font-black text-[var(--success)]">
                  Open
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-base font-black text-[var(--text)]">
                    Drawer closed
                  </p>

                  <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                    Open it before taking cash payments.
                  </p>
                </div>

                <Link
                  href="/money"
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  Open drawer
                </Link>
              </div>
            )}
          </div>
        </article>

        <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Owner checks
            </p>

            <h2 className="mt-1 text-lg font-black text-[var(--text)]">
              Needs attention
            </h2>
          </div>

          {hasAttention ? (
            <div className="divide-y divide-[var(--border)] px-5 sm:px-6">
              {lowStockProducts.length > 0 ? (
                <Link
                  href="/stock"
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--text)]">
                      Low stock
                    </p>

                    <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">
                      Products that need restocking
                    </p>
                  </div>

                  <span className="text-sm font-black text-[var(--danger)]">
                    {lowStockProducts.length}
                  </span>
                </Link>
              ) : null}

              {unpaidSales.length > 0 ? (
                <Link
                  href="/debts"
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--text)]">
                      Unpaid sales
                    </p>

                    <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">
                      Customers who still owe
                    </p>
                  </div>

                  <span className="text-sm font-black text-[var(--danger)]">
                    {unpaidSales.length}
                  </span>
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <p className="text-sm font-black text-[var(--text)]">
                Nothing needs attention.
              </p>

              <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                Stock is okay and there are no unpaid sales.
              </p>
            </div>
          )}
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Today
            </p>

            <h2 className="mt-1 text-lg font-black text-[var(--text)]">
              Recent sales
            </h2>
          </div>

          <Link
            href="/sales"
            className="text-xs font-black text-[var(--primary)] hover:text-[var(--primary-strong)]"
          >
            View all
          </Link>
        </div>

        {recentSales.length > 0 ? (
          <>
            <div className="hidden grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr] border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)] md:grid">
              <span>Customer</span>
              <span>Payment</span>
              <span>Time</span>
              <span className="text-right">Amount</span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="grid gap-2 px-5 py-4 sm:px-6 md:grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr] md:items-center"
                >
                  <p className="truncate text-sm font-black text-[var(--text)]">
                    {sale.customerName || 'Walk-in customer'}
                  </p>

                  <p className="text-xs font-bold text-[var(--muted)]">
                    {paymentName(sale.paymentMethod)}
                  </p>

                  <p className="text-xs font-bold text-[var(--muted)]">
                    {timeLabel(sale.saleDate)}
                  </p>

                  <p className="text-sm font-black text-[var(--text)] md:text-right">
                    {money(sale.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-sm font-bold text-[var(--muted)]">
              No sales recorded today.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
