import Link from 'next/link';
import { Download } from 'lucide-react';
import { requireOwner } from '@/lib/auth/session';
import {
  getReport,
  money,
  type ReportFilters,
  type ReportPreset,
} from '@/lib/reports/report-data';

type ReportsPageProps = {
  searchParams?: Promise<{
    preset?: string;
    fromDate?: string;
    fromTime?: string;
    toDate?: string;
    toTime?: string;
  }>;
};

const PRESETS: Array<{
  value: ReportPreset;
  label: string;
}> = [
  {
    value: 'today',
    label: 'Today',
  },
  {
    value: 'yesterday',
    label: 'Yesterday',
  },
  {
    value: 'week',
    label: 'This week',
  },
  {
    value: 'month',
    label: 'This month',
  },
  {
    value: 'custom',
    label: 'Custom',
  },
];

function reportQuery(
  filters: ReportFilters,
) {
  const params =
    new URLSearchParams();

  params.set(
    'preset',
    filters.preset,
  );

  if (
    filters.preset ===
    'custom'
  ) {
    params.set(
      'fromDate',
      filters.fromDate,
    );

    params.set(
      'fromTime',
      filters.fromTime,
    );

    params.set(
      'toDate',
      filters.toDate,
    );

    params.set(
      'toTime',
      filters.toTime,
    );
  }

  return params.toString();
}

function BreakdownRow({
  label,
  value,
  tone = 'normal',
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  tone?:
    | 'normal'
    | 'positive'
    | 'negative';
  strong?: boolean;
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-[#5F8A63] dark:text-[#79C27D]'
      : tone === 'negative'
        ? 'text-[#E85D5D]'
        : 'text-[#222222] dark:text-[#F5F5F5]';

  return (
    <div
      className={
        strong
          ? 'flex items-center justify-between gap-4 border-t-2 border-neutral-200 py-4 dark:border-[#3A3A3A]'
          : 'flex items-center justify-between gap-4 border-t border-neutral-100 py-3 first:border-t-0 dark:border-[#343434]'
      }
    >
      <span
        className={
          strong
            ? 'font-black text-[#222222] dark:text-[#F5F5F5]'
            : 'text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]'
        }
      >
        {label}
      </span>

      <span
        className={`shrink-0 ${
          strong
            ? 'text-base font-black'
            : 'text-sm font-black'
        } ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  await requireOwner();

  const params =
    await searchParams;

  const report =
    await getReport({
      preset:
        params?.preset,
      fromDate:
        params?.fromDate,
      fromTime:
        params?.fromTime,
      toDate:
        params?.toDate,
      toTime:
        params?.toTime,
    });

  const {
    summary,
    filters,
  } = report;

  const query =
    reportQuery(
      filters,
    );

  const hasSalesActivity =
    summary.salesCount > 0;

  const hasPaymentActivity =
    report.paymentRows.length > 0;

  const hasExpenseActivity =
    report.expenseCategoryRows.length > 0;

  const hasProductActivity =
    report.productRows.length > 0;

  const hasActivity =
    hasSalesActivity ||
    hasPaymentActivity ||
    hasExpenseActivity ||
    hasProductActivity;

  const hasProfitActivity =
    hasSalesActivity ||
    hasExpenseActivity;

  const hasProfit =
    summary.netProfit > 0;

  const hasLoss =
    summary.netProfit < 0;

  const resultTitle =
    !hasActivity
      ? 'No activity'
      : hasProfit
        ? 'Net profit'
        : hasLoss
          ? 'Net loss'
          : 'Net result';

  const resultAmount =
    hasLoss
      ? Math.abs(
          summary.netProfit,
        )
      : summary.netProfit;

  const resultMessage =
    !hasActivity
      ? 'No sales, payments or expenses were recorded in this period.'
      : !hasProfitActivity
        ? 'Payments were recorded in this period. No sales or expenses were recorded.'
        : hasProfit
          ? 'The boutique made a profit in this period.'
          : hasLoss
            ? 'Costs and expenses were higher than profit from sales in this period.'
            : 'The boutique broke even in this period.';

  const resultTone =
    hasProfit
      ? 'text-[#5F8A63] dark:text-[#79C27D]'
      : hasLoss
        ? 'text-[#E85D5D]'
        : 'text-[#222222] dark:text-[#F5F5F5]';

  const summaryItems = [
    {
      label: 'Sales',
      value:
        summary.salesTotal,
      helper: `${summary.salesCount} ${
        summary.salesCount === 1
          ? 'sale'
          : 'sales'
      }`,
    },
    {
      label:
        'Money received',
      value:
        summary.moneyReceived,
      helper:
        'Customer money received',
    },
    {
      label: 'Expenses',
      value:
        summary.expensesTotal,
      helper:
        'Business money spent',
    },
    {
      label:
        'Still unpaid',
      value:
        summary.stillUnpaid,
      helper:
        summary.salesCount === 0
          ? 'No sales in this period'
          : summary.unpaidSalesCount > 0
            ? `${summary.unpaidSalesCount} ${
                summary.unpaidSalesCount ===
                1
                  ? 'sale still has'
                  : 'sales still have'
              } money owed`
            : 'All period sales fully paid',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="border-b border-neutral-200 pb-4 dark:border-[#343434]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              Profit, money received, expenses and business performance.
            </p>
          </div>

          <Link
            href={`/reports/download?${query}&mode=download`}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)] sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Link>
        </div>

        <nav
          className="mt-4 flex gap-1 overflow-x-auto pb-1"
          aria-label="Report period"
        >
          {PRESETS.map(
            (preset) => {
              const active =
                filters.preset ===
                preset.value;

              return (
                <Link
                  key={
                    preset.value
                  }
                  href={`/reports?preset=${preset.value}`}
                  className={
                    active
                      ? 'shrink-0 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-black text-white'
                      : 'shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-[#6B7280] transition hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#A3A3A3]'
                  }
                >
                  {preset.label}
                </Link>
              );
            },
          )}
        </nav>

        {filters.preset ===
          'custom' && (
          <form
            action="/reports"
            className="mt-4 grid gap-3 rounded-xl border border-neutral-200 bg-[#FAFAFC] p-3 dark:border-[#343434] dark:bg-[#1B1B1B] sm:grid-cols-2 xl:grid-cols-[1fr_0.7fr_1fr_0.7fr_auto]"
          >
            <input
              type="hidden"
              name="preset"
              value="custom"
            />

            <label className="space-y-1.5">
              <span className="text-xs font-black text-[#6B7280] dark:text-[#A3A3A3]">
                From date
              </span>

              <input
                type="date"
                name="fromDate"
                required
                defaultValue={
                  filters.fromDate
                }
                className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-[#222222] outline-none focus:border-[var(--primary)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-[#6B7280] dark:text-[#A3A3A3]">
                From time
              </span>

              <input
                type="time"
                name="fromTime"
                required
                defaultValue={
                  filters.fromTime
                }
                className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-[#222222] outline-none focus:border-[var(--primary)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-[#6B7280] dark:text-[#A3A3A3]">
                To date
              </span>

              <input
                type="date"
                name="toDate"
                required
                defaultValue={
                  filters.toDate
                }
                className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-[#222222] outline-none focus:border-[var(--primary)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-[#6B7280] dark:text-[#A3A3A3]">
                To time
              </span>

              <input
                type="time"
                name="toTime"
                required
                defaultValue={
                  filters.toTime
                }
                className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-[#222222] outline-none focus:border-[var(--primary)] dark:border-[#343434] dark:bg-[#222222] dark:text-[#F5F5F5]"
              />
            </label>

            <button className="h-11 self-end rounded-lg bg-[#222222] px-5 text-sm font-black text-white transition hover:bg-black dark:bg-[#F5F5F5] dark:text-[#161616]">
              Show report
            </button>
          </form>
        )}

        <p className="mt-3 text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">
          {report.period.label}
        </p>
      </header>

      {report.period.error && (
        <div className="rounded-xl border border-[#E85D5D]/30 bg-[#E85D5D]/10 px-4 py-3 text-sm font-bold text-[#E85D5D]">
          {report.period.error}
        </div>
      )}

      <article className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-[#343434] dark:bg-[#222222] sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#6B7280] dark:text-[#A3A3A3]">
          {report.period.title}
        </p>

        <p className="mt-2 text-sm font-black text-[#6B7280] dark:text-[#A3A3A3]">
          {resultTitle}
        </p>

        <p
          className={`mt-1 break-words font-display text-3xl font-black tracking-tight sm:text-4xl ${resultTone}`}
        >
          {money(
            resultAmount,
          )}
        </p>

        <p className="mt-1.5 max-w-xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
          {resultMessage}
        </p>
      </article>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summaryItems.map(
          (item) => (
            <article
              key={item.label}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-[#343434] dark:bg-[#222222]"
            >
              <p className="text-xs font-black text-[#6B7280] dark:text-[#A3A3A3]">
                {item.label}
              </p>

              <p className="mt-2 break-words text-lg font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
                {money(
                  item.value,
                )}
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-[#6B7280] dark:text-[#A3A3A3]">
                {item.helper}
              </p>
            </article>
          ),
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2 xl:gap-x-8">
        <article className={hasPaymentActivity ? 'border-t border-neutral-200 pt-4 dark:border-[#343434] sm:pt-5' : 'hidden'}>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              Money
            </p>

            <h3 className="mt-1 font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
              Money received by method
            </h3>

            <p className="mt-1 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
              How customer payments were received in this period.
            </p>
          </div>

          {report.paymentRows.length ===
          0 ? (
            <p className="mt-4 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              No customer money received in this period.
            </p>
          ) : (
            <div className="mt-4">
              {report.paymentRows.map(
                (row) => (
                  <div
                    key={
                      row.method
                    }
                    className="flex items-center justify-between gap-4 border-t border-neutral-100 py-3 first:border-t-0 dark:border-[#343434]"
                  >
                    <div className="min-w-0">
                      <p className="font-black text-[#222222] dark:text-[#F5F5F5]">
                        {row.name}
                      </p>

                      <p className="mt-0.5 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                        {row.total > 0
                          ? `${Math.round(
                              row.percentage,
                            )}% of received money`
                          : 'Money returned through this method'}
                      </p>
                    </div>

                    <p
                      className={
                        row.total < 0
                          ? 'shrink-0 font-black text-[#E85D5D]'
                          : 'shrink-0 font-black text-[#222222] dark:text-[#F5F5F5]'
                      }
                    >
                      {money(
                        row.total,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </article>

        <article className={hasProfitActivity ? 'border-t border-neutral-200 pt-4 dark:border-[#343434] sm:pt-5' : 'hidden'}>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            Profit
          </p>

          <h3 className="mt-1 font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Profit breakdown
          </h3>

          <div className="mt-4">
            {summary.discountTotal >
              0 && (
              <>
                <BreakdownRow
                  label="Sales before discount"
                  value={money(
                    summary.salesBeforeDiscount,
                  )}
                />

                <BreakdownRow
                  label="Discounts"
                  value={`− ${money(
                    summary.discountTotal,
                  )}`}
                  tone="negative"
                />
              </>
            )}

            <BreakdownRow
              label="Sales"
              value={money(
                summary.salesTotal,
              )}
            />

            <BreakdownRow
              label="Cost of items sold"
              value={`− ${money(
                summary.costOfItemsSold,
              )}`}
              tone="negative"
            />

            <BreakdownRow
              label="Gross profit"
              value={money(
                summary.grossProfit,
              )}
              tone={
                summary.grossProfit >=
                0
                  ? 'positive'
                  : 'negative'
              }
            />

            <BreakdownRow
              label="Expenses"
              value={`− ${money(
                summary.expensesTotal,
              )}`}
              tone="negative"
            />

            <BreakdownRow
              label={resultTitle}
              value={money(
                resultAmount,
              )}
              tone={
                hasLoss
                  ? 'negative'
                  : summary.netProfit >
                      0
                    ? 'positive'
                    : 'normal'
              }
              strong
            />
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2 xl:gap-x-8">
        <article className={hasExpenseActivity ? 'border-t border-neutral-200 pt-4 dark:border-[#343434] sm:pt-5' : 'hidden'}>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            Expenses
          </p>

          <h3 className="mt-1 font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Where money was spent
          </h3>

          {report
            .expenseCategoryRows
            .length === 0 ? (
            <p className="mt-4 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              No expenses in this period.
            </p>
          ) : (
            <div className="mt-4">
              {report.expenseCategoryRows.map(
                (row) => (
                  <div
                    key={
                      row.category
                    }
                    className="flex items-center justify-between gap-4 border-t border-neutral-100 py-3 first:border-t-0 dark:border-[#343434]"
                  >
                    <p className="min-w-0 break-words text-sm font-bold text-[#222222] dark:text-[#F5F5F5]">
                      {
                        row.category
                      }
                    </p>

                    <p className="shrink-0 text-sm font-black text-[#E85D5D]">
                      {money(
                        row.total,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </article>

        <article className={hasProductActivity ? 'border-t border-neutral-200 pt-4 dark:border-[#343434] sm:pt-5' : 'hidden'}>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            Products
          </p>

          <h3 className="mt-1 font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
            Top products sold
          </h3>

          {report.productRows
            .length === 0 ? (
            <p className="mt-4 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
              No products sold in this period.
            </p>
          ) : (
            <div className="mt-4">
              {report.productRows.map(
                (row) => (
                  <div
                    key={
                      row.name
                    }
                    className="flex items-start justify-between gap-4 border-t border-neutral-100 py-3 first:border-t-0 dark:border-[#343434]"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                        {row.name}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                        {row.quantity}{' '}
                        sold / Profit{' '}
                        {money(
                          row.profit,
                        )}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-black text-[#222222] dark:text-[#F5F5F5]">
                      {money(
                        row.total,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
