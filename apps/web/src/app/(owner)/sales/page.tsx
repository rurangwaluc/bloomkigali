import Link from 'next/link';
import {
  and,
  desc,
  eq,
  inArray,
  or,
} from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { db } from '@bloom-kigali/db/client';
import {
  corrections,
  saleItems,
  sales,
} from '@bloom-kigali/db/schema';
import { requireUser } from '@/lib/auth/session';

type SalesPageProps = {
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

function paymentName(
  value: string,
) {
  const names: Record<
    string,
    string
  > = {
    CASH: 'Cash',
    MOBILE_MONEY:
      'Mobile money',
    BANK: 'Bank',
    CARD: 'Card',
  };

  return names[value] || value;
}

type PendingSaleRequest = {
  targetType: string;
  beforeValues: Record<string, unknown>;
  afterValues: Record<string, unknown>;
  reason: string;
};

function pendingSaleHint(
  request:
    | PendingSaleRequest
    | undefined,
) {
  if (!request) {
    return null;
  }

  if (
    request.targetType !==
    'SALE_PAYMENT'
  ) {
    return {
      label:
        'Sale fix requested',
      detail:
        request.reason,
    };
  }

  const before =
    request.beforeValues;

  const after =
    request.afterValues;

  const details:
    string[] = [];

  if (
    String(
      before.paymentMethod ||
        '',
    ) !==
    String(
      after.paymentMethod ||
        '',
    )
  ) {
    details.push(
      `${paymentName(
        String(
          before.paymentMethod ||
            '',
        ),
      )} → ${paymentName(
        String(
          after.paymentMethod ||
            '',
        ),
      )}`,
    );
  }

  if (
    Number(
      before.receivedAmount ||
        0,
    ) !==
    Number(
      after.receivedAmount ||
        0,
    )
  ) {
    details.push(
      `Received ${money(
        Number(
          before.receivedAmount ||
            0,
        ),
      )} → ${money(
        Number(
          after.receivedAmount ||
            0,
        ),
      )}`,
    );
  }

  if (
    Number(
      before.returnedAmount ||
        0,
    ) !==
    Number(
      after.returnedAmount ||
        0,
    )
  ) {
    details.push(
      `Returned ${money(
        Number(
          before.returnedAmount ||
            0,
        ),
      )} → ${money(
        Number(
          after.returnedAmount ||
            0,
        ),
      )}`,
    );
  }

  if (
    Number(
      before.extraKeptAmount ||
        0,
    ) !==
    Number(
      after.extraKeptAmount ||
        0,
    )
  ) {
    details.push(
      `Extra kept ${money(
        Number(
          before.extraKeptAmount ||
            0,
        ),
      )} → ${money(
        Number(
          after.extraKeptAmount ||
            0,
        ),
      )}`,
    );
  }

  return {
    label:
      'Payment fix requested',
    detail:
      details.join(' / ') ||
      request.reason,
  };
}


function dateTime(value: Date) {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone:
        'Africa/Kigali',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(value);
}

function kigaliDayKey(
  value: Date,
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'Africa/Kigali',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
    ).formatToParts(value);

  const get = (
    type: string,
  ) =>
    parts.find(
      (part) =>
        part.type === type,
    )?.value || '';

  return `${get(
    'year',
  )}-${get(
    'month',
  )}-${get('day')}`;
}

function buildLoadMoreHref(
  nextTake: number,
) {
  return `/sales?take=${nextTake}`;
}

export default async function SalesPage({
  searchParams,
}: SalesPageProps) {
  const user =
    await requireUser();

  const isOwner =
    user.role === 'OWNER';

  const params =
    await searchParams;

  const take = Math.max(
    PAGE_SIZE,
    Number(
      params?.take ||
        PAGE_SIZE,
    ),
  );

  const saleList = await db
    .select()
    .from(sales)
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
          .select({
            saleId:
              saleItems.saleId,
            itemName:
              saleItems.itemName,
            quantity:
              saleItems.quantity,
          })
          .from(saleItems)
          .where(
            inArray(
              saleItems.saleId,
              visibleSaleIds,
            ),
          )
      : [];

  const pendingRequests =
    visibleSaleIds.length > 0
      ? await db
          .select({
            targetId:
              corrections.targetId,
            targetType:
              corrections.targetType,
            beforeValues:
              corrections.beforeValues,
            afterValues:
              corrections.afterValues,
            reason:
              corrections.reason,
          })
          .from(corrections)
          .where(
            and(
              eq(
                corrections.status,
                'PENDING',
              ),
              inArray(
                corrections.targetId,
                visibleSaleIds,
              ),
              or(
                eq(
                  corrections.targetType,
                  'SALE',
                ),
                eq(
                  corrections.targetType,
                  'SALE_PAYMENT',
                ),
              ),
            ),
          )
      : [];

  const pendingRequestBySaleId =
    new Map(
      pendingRequests.map(
        (request) => [
          request.targetId,
          request,
        ],
      ),
    );

  const todayKey =
    kigaliDayKey(
      new Date(),
    );

  const todaySales =
    saleList.filter(
      (sale) =>
        kigaliDayKey(
          sale.saleDate,
        ) === todayKey,
    );

  const totalToday =
    todaySales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.totalAmount,
        ),
      0,
    );

  const unpaidToday =
    todaySales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.balanceAmount,
        ),
      0,
    );

  return (
    <section className="space-y-4">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {isOwner ? (
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                  Today sold
                </p>

                <p className="mt-1 text-xl font-black text-[var(--text)]">
                  {money(
                    totalToday,
                  )}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                  Unpaid today
                </p>

                <p
                  className={
                    unpaidToday > 0
                      ? 'mt-1 text-xl font-black text-[#F2A71B]'
                      : 'mt-1 text-xl font-black text-[#5F8A63] dark:text-[#79C27D]'
                  }
                >
                  {money(
                    unpaidToday,
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                Today
              </p>

              <p className="mt-1 text-xl font-black text-[var(--text)]">
                {
                  todaySales.length
                }{' '}
                {todaySales.length ===
                1
                  ? 'sale'
                  : 'sales'}
              </p>
            </div>
          )}

          <Link
            href="/sales/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)]"
          >
            <Plus className="h-4 w-4" />
            New sale
          </Link>
        </div>
      </section>

      {visibleSales.length ===
      0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-8 text-center">
          <h3 className="font-display text-xl font-black text-[var(--text)]">
            No sales yet
          </h3>

          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            Record the first
            sale when a customer
            buys something.
          </p>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                  Sales
                </p>

                <h2 className="mt-1 font-display text-xl font-black text-[var(--text)]">
                  Recent sales
                </h2>
              </div>

              <p className="text-xs font-bold text-[var(--muted)]">
                {saleList.length}{' '}
                {saleList.length ===
                1
                  ? 'sale'
                  : 'sales'}
              </p>
            </div>

            <div className="hidden lg:block">
              <div className="grid grid-cols-[1.35fr_1.1fr_0.8fr_0.75fr_0.75fr] gap-4 border-b border-[var(--border)] px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                <div>Sale</div>
                <div>
                  Customer
                </div>
                <div>
                  Payment
                </div>
                <div>Total</div>
                <div>Status</div>
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
                      );

                    const hint =
                      pendingSaleHint(
                        pendingRequestBySaleId.get(
                          sale.id,
                        ),
                      );

                    return (
                      <Link
                        key={
                          sale.id
                        }
                        href={`/sales/${sale.id}`}
                        className="grid grid-cols-[1.35fr_1.1fr_0.8fr_0.75fr_0.75fr] items-center gap-4 px-5 py-4 transition hover:bg-[var(--surface)]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[var(--text)]">
                            {dateTime(
                              sale.saleDate,
                            )}
                          </p>

                          <p className="mt-1 truncate text-xs font-semibold text-[var(--muted)]">
                            {names ||
                              'Sale'}
                          </p>

                          {hint ? (
                            <div className="mt-2 border-l-2 border-[var(--primary)] pl-2">
                              <p className="text-[11px] font-black text-[var(--primary)]">
                                {hint.label}
                              </p>

                              <p className="mt-0.5 text-xs font-bold text-[var(--text)]">
                                {hint.detail}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[var(--text)]">
                            {sale.customerName ||
                              'Walk-in customer'}
                          </p>

                          {sale.customerPhone ? (
                            <p className="mt-1 truncate text-xs font-semibold text-[var(--muted)]">
                              {
                                sale.customerPhone
                              }
                            </p>
                          ) : null}
                        </div>

                        <p className="text-sm font-bold text-[var(--text)]">
                          {paymentName(
                            sale.paymentMethod,
                          )}
                        </p>

                        <p className="text-sm font-black text-[var(--text)]">
                          {money(
                            sale.totalAmount,
                          )}
                        </p>

                        <div>
                          {unpaid > 0 ? (
                            <>
                              <p className="text-sm font-black text-[#F2A71B]">
                                Unpaid
                              </p>

                              <p className="mt-1 text-xs font-bold text-[#F2A71B]">
                                {money(
                                  unpaid,
                                )}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
                              Paid
                            </p>
                          )}
                        </div>
                      </Link>
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
                    );

                  const hint =
                    pendingSaleHint(
                      pendingRequestBySaleId.get(
                        sale.id,
                      ),
                    );

                  return (
                    <Link
                      key={
                        sale.id
                      }
                      href={`/sales/${sale.id}`}
                      className="block p-4 transition hover:bg-[var(--surface)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-black text-[var(--text)]">
                            {sale.customerName ||
                              'Walk-in customer'}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                            {dateTime(
                              sale.saleDate,
                            )}{' '}
                            /{' '}
                            {paymentName(
                              sale.paymentMethod,
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-[var(--text)]">
                            {money(
                              sale.totalAmount,
                            )}
                          </p>

                          <p
                            className={
                              unpaid > 0
                                ? 'mt-1 text-xs font-black text-[#F2A71B]'
                                : 'mt-1 text-xs font-black text-[#5F8A63] dark:text-[#79C27D]'
                            }
                          >
                            {unpaid > 0
                              ? `Unpaid ${money(
                                  unpaid,
                                )}`
                              : 'Paid'}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 truncate text-xs font-semibold text-[var(--muted)]">
                        {names ||
                          'Sale'}
                      </p>

                      {hint ? (
                        <div className="mt-3 border-l-2 border-[var(--primary)] pl-2">
                          <p className="text-[11px] font-black text-[var(--primary)]">
                            {hint.label}
                          </p>

                          <p className="mt-0.5 text-xs font-bold text-[var(--text)]">
                            {hint.detail}
                          </p>
                        </div>
                      ) : null}
                    </Link>
                  );
                },
              )}
            </div>
          </section>

          {hasMore ? (
            <div className="flex justify-center">
              <Link
                href={buildLoadMoreHref(
                  take +
                    PAGE_SIZE,
                )}
                className="inline-flex h-10 items-center rounded-lg border border-[var(--border)] px-4 text-sm font-black text-[var(--text)]"
              >
                Load more
              </Link>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
