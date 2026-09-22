import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  and,
  desc,
  eq,
  inArray,
} from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@bloom-kigali/db/client';
import {
  corrections,
  customers,
  saleItems,
  sales,
} from '@bloom-kigali/db/schema';
import { requireUser } from '@/lib/auth/session';

type CustomerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    take?: string;
  }>;
};

const PAGE_SIZE = 10;

function money(
  value: string | number,
) {
  return `RWF ${Number(
    value,
  ).toLocaleString('en-US')}`;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(value);
}

function buildLoadMoreHref(
  customerId: string,
  nextTake: number,
) {
  return `/customers/${customerId}?take=${nextTake}`;
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  const user =
    await requireUser();

  const { id } =
    await params;

  const query =
    await searchParams;

  const take = Math.max(
    PAGE_SIZE,
    Number(
      query?.take ||
        PAGE_SIZE,
    ),
  );

  const [customer] = await db
    .select()
    .from(customers)
    .where(
      eq(
        customers.id,
        id,
      ),
    )
    .limit(1);

  if (
    !customer ||
    customer.status !== 'ACTIVE'
  ) {
    notFound();
  }

  const [pendingRequest] =
    await db
      .select({
        id:
          corrections.id,
      })
      .from(
        corrections,
      )
      .where(
        and(
          eq(
            corrections.targetType,
            'CUSTOMER',
          ),
          eq(
            corrections.targetId,
            customer.id,
          ),
          eq(
            corrections.status,
            'PENDING',
          ),
        ),
      )
      .limit(1);

  const saleList = await db
    .select()
    .from(sales)
    .where(
      eq(
        sales.customerId,
        customer.id,
      ),
    )
    .orderBy(
      desc(
        sales.saleDate,
      ),
    );

  const visibleSales =
    saleList.slice(
      0,
      take,
    );

  const hasMore =
    saleList.length >
    visibleSales.length;

  const visibleSaleIds =
    visibleSales.map(
      (sale) => sale.id,
    );

  const itemList =
    visibleSaleIds.length > 0
      ? await db
          .select()
          .from(saleItems)
          .where(
            inArray(
              saleItems.saleId,
              visibleSaleIds,
            ),
          )
      : [];

  const totalBought =
    saleList.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.totalAmount,
        ),
      0,
    );

  const unpaidBalance =
    saleList.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.balanceAmount,
        ),
      0,
    );

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Customer
            </p>

            <h2 className="mt-1 font-display text-3xl font-black tracking-tight text-[var(--text)]">
              {customer.name}
            </h2>

            {customer.phone ? (
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                {customer.phone}
              </p>
            ) : null}

            {customer.notes ? (
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
                {customer.notes}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-6 sm:justify-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                Total bought
              </p>

              <p className="mt-1 text-xl font-black text-[var(--text)]">
                {money(
                  totalBought,
                )}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                {unpaidBalance > 0
                  ? 'Unpaid'
                  : 'Status'}
              </p>

              {unpaidBalance > 0 ? (
                <p className="mt-1 text-xl font-black text-[#F2A71B]">
                  {money(
                    unpaidBalance,
                  )}
                </p>
              ) : (
                <p className="mt-1 text-xl font-black text-[#5F8A63] dark:text-[#79C27D]">
                  Clear
                </p>
              )}
            </div>

            {pendingRequest ? (
              user.role ===
              'OWNER' ? (
                <Link
                  href="/requests"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--primary)] px-4 text-sm font-black text-[var(--primary)]"
                >
                  Review request
                </Link>
              ) : (
                <span className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--primary)] px-4 text-sm font-black text-[var(--primary)]">
                  Fix requested
                </span>
              )
            ) : (
              <Link
                href={`/customers/${customer.id}/edit`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)]"
              >
                {user.role ===
                'OWNER'
                  ? 'Fix customer details'
                  : 'Ask owner to fix'}
              </Link>
            )}

            <Link
              href="/customers"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Purchases
            </p>

            <h3 className="mt-1 font-display text-xl font-black text-[var(--text)]">
              What this customer bought
            </h3>
          </div>

          {saleList.length > 0 ? (
            <p className="text-xs font-bold text-[var(--muted)]">
              {saleList.length}{' '}
              {saleList.length ===
              1
                ? 'sale'
                : 'sales'}
            </p>
          ) : null}
        </div>

        {visibleSales.length ===
        0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-semibold text-[var(--muted)]">
              No purchases yet.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <div className="grid grid-cols-[1fr_1.7fr_0.8fr_0.65fr_auto] gap-4 border-b border-[var(--border)] px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                <div>Date</div>
                <div>Items</div>
                <div>Total</div>
                <div>Status</div>
                <div />
              </div>

              <div className="divide-y divide-[var(--border)]">
                {visibleSales.map(
                  (sale) => {
                    const items =
                      itemList.filter(
                        (item) =>
                          item.saleId ===
                          sale.id,
                      );

                    const names =
                      items
                        .map(
                          (item) =>
                            `${item.itemName} x${item.quantity}`,
                        )
                        .join(', ');

                    const unpaid =
                      Number(
                        sale.balanceAmount,
                      ) > 0;

                    return (
                      <div
                        key={
                          sale.id
                        }
                        className="grid grid-cols-[1fr_1.7fr_0.8fr_0.65fr_auto] items-center gap-4 px-5 py-3"
                      >
                        <p className="text-sm font-bold text-[var(--text)]">
                          {dateTime(
                            sale.saleDate,
                          )}
                        </p>

                        <p className="min-w-0 truncate text-sm font-semibold text-[var(--text)]">
                          {names ||
                            'Sale'}
                        </p>

                        <p className="text-sm font-black text-[var(--text)]">
                          {money(
                            sale.totalAmount,
                          )}
                        </p>

                        <p
                          className={
                            unpaid
                              ? 'text-sm font-black text-[#F2A71B]'
                              : 'text-sm font-black text-[#5F8A63] dark:text-[#79C27D]'
                          }
                        >
                          {unpaid
                            ? 'Unpaid'
                            : 'Paid'}
                        </p>

                        <div className="flex items-center gap-2">
                          {unpaid ? (
                            <Link
                              href={`/debts/${sale.id}`}
                              className="inline-flex h-9 items-center rounded-lg bg-[var(--primary)] px-3 text-xs font-black text-white transition hover:bg-[var(--primary-strong)]"
                            >
                              Collect payment
                            </Link>
                          ) : null}

                          <Link
                            href={`/sales/${sale.id}`}
                            className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-3 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)]"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <div className="divide-y divide-[var(--border)] lg:hidden">
              {visibleSales.map(
                (sale) => {
                  const items =
                    itemList.filter(
                      (item) =>
                        item.saleId ===
                        sale.id,
                    );

                  const names =
                    items
                      .map(
                        (item) =>
                          `${item.itemName} x${item.quantity}`,
                      )
                      .join(', ');

                  const unpaid =
                    Number(
                      sale.balanceAmount,
                    ) > 0;

                  return (
                    <div
                      key={
                        sale.id
                      }
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-black text-[var(--text)]">
                            {money(
                              sale.totalAmount,
                            )}
                          </p>

                          <p className="mt-1 truncate text-xs font-semibold text-[var(--muted)]">
                            {names ||
                              'Sale'}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                            {dateTime(
                              sale.saleDate,
                            )}
                          </p>
                        </div>

                        <p
                          className={
                            unpaid
                              ? 'shrink-0 text-xs font-black text-[#F2A71B]'
                              : 'shrink-0 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]'
                          }
                        >
                          {unpaid
                            ? 'Unpaid'
                            : 'Paid'}
                        </p>
                      </div>

                      <div className="mt-3 flex gap-2">
                        {unpaid ? (
                          <Link
                            href={`/debts/${sale.id}`}
                            className="inline-flex h-9 items-center rounded-lg bg-[var(--primary)] px-3 text-xs font-black text-white"
                          >
                            Collect payment
                          </Link>
                        ) : null}

                        <Link
                          href={`/sales/${sale.id}`}
                          className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-3 text-xs font-black text-[var(--text)]"
                        >
                          Open sale
                        </Link>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </>
        )}

        {hasMore ? (
          <div className="flex justify-center border-t border-[var(--border)] p-4">
            <Link
              href={buildLoadMoreHref(
                customer.id,
                take +
                  PAGE_SIZE,
              )}
              className="inline-flex h-10 items-center rounded-lg border border-[var(--border)] px-4 text-sm font-black text-[var(--text)]"
            >
              Load more
            </Link>
          </div>
        ) : null}
      </section>
    </section>
  );
}
