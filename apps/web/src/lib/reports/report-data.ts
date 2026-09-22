import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '@bloom-kigali/db/client';
import {
  expenses,
  saleItems,
  salePayments,
  sales,
} from '@bloom-kigali/db/schema';

export const KIGALI_TIME_ZONE = 'Africa/Kigali';

const KIGALI_UTC_OFFSET = '+02:00';

const PAYMENT_METHODS = [
  'CASH',
  'MOBILE_MONEY',
  'BANK',
  'CARD',
] as const;

export type ReportPreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'custom';

export type ReportInput = {
  preset?: string | null;
  fromDate?: string | null;
  fromTime?: string | null;
  toDate?: string | null;
  toTime?: string | null;
};

export type ReportFilters = {
  preset: ReportPreset;
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
};

export function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}`;
}

export function paymentName(value: string) {
  const names: Record<string, string> = {
    CASH: 'Cash',
    MOBILE_MONEY: 'Mobile Money',
    BANK: 'Bank',
    CARD: 'Card',
  };

  return names[value] || value;
}

function kigaliNowParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KIGALI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}

export function getTodayInputDate() {
  const now = kigaliNowParts();
  return `${now.year}-${now.month}-${now.day}`;
}

export function getCurrentKigaliTime() {
  const now = kigaliNowParts();
  return `${now.hour}:${now.minute}`;
}

function isValidDate(value: string | undefined | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidTime(value: string | undefined | null) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hour, minute] = value.split(':').map(Number);

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

export function cleanReportPreset(
  value: string | undefined | null,
): ReportPreset {
  if (
    value === 'today' ||
    value === 'yesterday' ||
    value === 'week' ||
    value === 'month' ||
    value === 'custom'
  ) {
    return value;
  }

  return 'today';
}

export function cleanReportDate(
  value: string | undefined | null,
  fallback = getTodayInputDate(),
) {
  return isValidDate(value) ? value! : fallback;
}

export function cleanReportTime(
  value: string | undefined | null,
  fallback: string,
) {
  return isValidTime(value) ? value! : fallback;
}

function shiftDate(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getWeekStartDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const difference = weekday === 0 ? -6 : 1 - weekday;

  return shiftDate(value, difference);
}

function getMonthStartDate(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function toKigaliDateTime(
  date: string,
  time: string,
  endOfMinute = false,
) {
  const seconds = endOfMinute ? '59.999' : '00.000';

  return new Date(
    `${date}T${time}:${seconds}${KIGALI_UTC_OFFSET}`,
  );
}

function startOfKigaliDay(date: string) {
  return toKigaliDateTime(date, '00:00');
}

function endOfKigaliDay(date: string) {
  return toKigaliDateTime(date, '23:59', true);
}

export function readableDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: KIGALI_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(
    new Date(`${value}T12:00:00${KIGALI_UTC_OFFSET}`),
  );
}

function readableMonth(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: KIGALI_TIME_ZONE,
    month: 'long',
    year: 'numeric',
  }).format(
    new Date(`${value}T12:00:00${KIGALI_UTC_OFFSET}`),
  );
}

function normalizeReportFilters(
  input: ReportInput = {},
): ReportFilters {
  const today = getTodayInputDate();
  const currentTime = getCurrentKigaliTime();
  const preset = cleanReportPreset(input.preset);

  if (preset === 'custom') {
    const fromDate = cleanReportDate(
      input.fromDate,
      today,
    );

    const toDate = cleanReportDate(
      input.toDate,
      fromDate,
    );

    return {
      preset,
      fromDate,
      fromTime: cleanReportTime(
        input.fromTime,
        '00:00',
      ),
      toDate,
      toTime: cleanReportTime(
        input.toTime,
        toDate === today ? currentTime : '23:59',
      ),
    };
  }

  if (preset === 'yesterday') {
    const yesterday = shiftDate(today, -1);

    return {
      preset,
      fromDate: yesterday,
      fromTime: '00:00',
      toDate: yesterday,
      toTime: '23:59',
    };
  }

  if (preset === 'week') {
    return {
      preset,
      fromDate: getWeekStartDate(today),
      fromTime: '00:00',
      toDate: today,
      toTime: '23:59',
    };
  }

  if (preset === 'month') {
    return {
      preset,
      fromDate: getMonthStartDate(today),
      fromTime: '00:00',
      toDate: today,
      toTime: '23:59',
    };
  }

  return {
    preset: 'today',
    fromDate: today,
    fromTime: '00:00',
    toDate: today,
    toTime: '23:59',
  };
}

export function getReportPeriod(
  input: ReportInput = {},
) {
  const filters = normalizeReportFilters(input);

  if (filters.preset === 'custom') {
    const start = toKigaliDateTime(
      filters.fromDate,
      filters.fromTime,
    );

    const requestedEnd = toKigaliDateTime(
      filters.toDate,
      filters.toTime,
      true,
    );

    const hasInvalidRange =
      requestedEnd.getTime() < start.getTime();

    const end = hasInvalidRange
      ? new Date(start.getTime() - 1)
      : requestedEnd;

    const sameDate =
      filters.fromDate === filters.toDate;

    return {
      filters,
      start,
      end,
      title: 'Custom report',
      label: sameDate
        ? `${readableDate(filters.fromDate)} / ${filters.fromTime} – ${filters.toTime}`
        : `${readableDate(filters.fromDate)} ${filters.fromTime} – ${readableDate(filters.toDate)} ${filters.toTime}`,
      fileLabel: `${filters.fromDate}-${filters.fromTime.replace(':', '')}-to-${filters.toDate}-${filters.toTime.replace(':', '')}`,
      error: hasInvalidRange
        ? 'The end date and time must be after the start date and time.'
        : null,
    };
  }

  if (filters.preset === 'yesterday') {
    return {
      filters,
      start: startOfKigaliDay(filters.fromDate),
      end: endOfKigaliDay(filters.toDate),
      title: 'Yesterday',
      label: readableDate(filters.fromDate),
      fileLabel: filters.fromDate,
      error: null,
    };
  }

  if (filters.preset === 'week') {
    return {
      filters,
      start: startOfKigaliDay(filters.fromDate),
      end: endOfKigaliDay(filters.toDate),
      title: 'This week',
      label: `${readableDate(filters.fromDate)} – ${readableDate(filters.toDate)}`,
      fileLabel: `${filters.fromDate}-to-${filters.toDate}`,
      error: null,
    };
  }

  if (filters.preset === 'month') {
    return {
      filters,
      start: startOfKigaliDay(filters.fromDate),
      end: endOfKigaliDay(filters.toDate),
      title: 'This month',
      label: readableMonth(filters.toDate),
      fileLabel: filters.toDate.slice(0, 7),
      error: null,
    };
  }

  return {
    filters,
    start: startOfKigaliDay(filters.fromDate),
    end: endOfKigaliDay(filters.toDate),
    title: 'Today',
    label: readableDate(filters.fromDate),
    fileLabel: filters.fromDate,
    error: null,
  };
}

export async function getReport(
  input: ReportInput = {},
) {
  const period = getReportPeriod(input);

  const [saleList, expenseList, paymentList] =
    await Promise.all([
      db
        .select()
        .from(sales)
        .where(
          and(
            gte(sales.saleDate, period.start),
            lte(sales.saleDate, period.end),
          ),
        ),

      db
        .select()
        .from(expenses)
        .where(
          and(
            gte(expenses.expenseDate, period.start),
            lte(expenses.expenseDate, period.end),
          ),
        ),

      db
        .select()
        .from(salePayments)
        .where(
          and(
            eq(salePayments.isActive, true),
            gte(salePayments.paidAt, period.start),
            lte(salePayments.paidAt, period.end),
          ),
        ),
    ]);

  const saleIds = saleList.map(
    (sale) => sale.id,
  );

  let itemList: Array<
    typeof saleItems.$inferSelect
  > = [];

  if (saleIds.length > 0) {
    itemList = await db
      .select()
      .from(saleItems)
      .where(
        inArray(
          saleItems.saleId,
          saleIds,
        ),
      );
  }

  const salesBeforeDiscount =
    saleList.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.subtotalAmount,
        ),
      0,
    );

  const discountTotal =
    saleList.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.discountAmount,
        ),
      0,
    );

  const salesTotal =
    saleList.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.totalAmount,
        ),
      0,
    );

  const costOfItemsSold =
    itemList.reduce(
      (sum, item) =>
        sum +
        Number(
          item.unitCost,
        ) *
          Number(
            item.quantity,
          ),
      0,
    );

  const grossProfit =
    salesTotal -
    costOfItemsSold;

  const expensesTotal =
    expenseList.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount,
        ),
      0,
    );

  /*
   * Customer money intentionally retained above the
   * amount applied to a sale is business income.
   *
   * We tie it to the sale period so an old sale does not
   * suddenly change today's sales profit just because a
   * payment happened later.
   */
  const netProfit =
    grossProfit -
    expensesTotal;

  /*
   * Money received follows payment time, not sale time.
   * This correctly includes a later payment received today
   * for a sale that happened on an earlier day.
   */
  const moneyReceived =
    paymentList.reduce(
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

  const stillUnpaid =
    saleList.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.balanceAmount,
        ),
      0,
    );

  const unpaidSalesCount =
    saleList.filter(
      (sale) =>
        Number(
          sale.balanceAmount,
        ) > 0,
    ).length;

  function methodBreakdown(
    payment:
      typeof salePayments.$inferSelect,
    method:
      (typeof PAYMENT_METHODS)[number],
  ) {
    const received =
      payment.paymentMethod === method
        ? Number(
            payment.receivedAmount,
          )
        : 0;

    const returned =
      payment.returnMethod === method
        ? Number(
            payment.returnedAmount,
          )
        : 0;

    return {
      received,
      returned,
      net:
        received -
        returned,
    };
  }

  const rawPaymentRows =
    PAYMENT_METHODS.map(
      (method) => {
        const values =
          paymentList.reduce(
            (
              totals,
              payment,
            ) => {
              const value =
                methodBreakdown(
                  payment,
                  method,
                );

              totals.received +=
                value.received;

              totals.returned +=
                value.returned;

              totals.total +=
                value.net;

              if (
                payment.paymentType ===
                'AT_SALE'
              ) {
                totals.atSale +=
                  value.net;
              } else {
                totals.later +=
                  value.net;
              }

              return totals;
            },
            {
              received: 0,
              returned: 0,
              total: 0,
              atSale: 0,
              later: 0,
            },
          );

        return {
          method,
          name:
            paymentName(
              method,
            ),
          ...values,
        };
      },
    ).filter(
      (row) =>
        Math.abs(
          row.total,
        ) > 0.0001 ||
        row.received > 0 ||
        row.returned > 0,
    );

  const positivePaymentTotal =
    rawPaymentRows.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          row.total,
        ),
      0,
    );

  const paymentRows =
    rawPaymentRows.map(
      (row) => ({
        ...row,
        percentage:
          row.total > 0 &&
          positivePaymentTotal > 0
            ? (
                row.total /
                positivePaymentTotal
              ) *
              100
            : 0,
      }),
    );

  const expenseMap =
    expenseList.reduce<
      Map<string, number>
    >(
      (map, expense) => {
        map.set(
          expense.category,
          (
            map.get(
              expense.category,
            ) || 0
          ) +
            Number(
              expense.amount,
            ),
        );

        return map;
      },
      new Map(),
    );

  const expenseCategoryRows =
    Array.from(
      expenseMap.entries(),
    )
      .map(
        ([category, total]) => ({
          category,
          total,
        }),
      )
      .sort(
        (a, b) =>
          b.total -
          a.total,
      )
      .slice(0, 10);

  const soldProducts =
    itemList.reduce<
      Map<
        string,
        {
          name: string;
          quantity: number;
          total: number;
          profit: number;
        }
      >
    >(
      (map, item) => {
        const current =
          map.get(
            item.productId,
          ) || {
            name: item.itemName,
            quantity: 0,
            total: 0,
            profit: 0,
          };

        const itemCost =
          Number(
            item.unitCost,
          ) *
          Number(
            item.quantity,
          );

        const itemProfit =
          Number(
            item.profitAmount ||
              0,
          );

        current.quantity +=
          Number(
            item.quantity,
          );

        /*
         * profitAmount already contains the sale-level
         * discount allocation, so cost + profit gives the
         * product's true net sales contribution.
         */
        current.total +=
          itemCost +
          itemProfit;

        current.profit +=
          itemProfit;

        map.set(
          item.productId,
          current,
        );

        return map;
      },
      new Map(),
    );

  const productRows =
    Array.from(
      soldProducts.values(),
    )
      .sort(
        (a, b) =>
          b.total -
          a.total,
      )
      .slice(0, 5);

  return {
    filters:
      period.filters,
    period,
    summary: {
      salesBeforeDiscount,
      discountTotal,
      salesTotal,
      costOfItemsSold,
      grossProfit,
      expensesTotal,
      netProfit,
      moneyReceived,
      stillUnpaid,
      salesCount:
        saleList.length,
      unpaidSalesCount,
    },
    paymentRows,
    expenseCategoryRows,
    productRows,
  };
}
