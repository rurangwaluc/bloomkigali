import Link from 'next/link';
import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import {
  Plus,
  Search,
} from 'lucide-react';
import { db } from '@bloom-kigali/db/client';
import {
  products,
  stockArrivals,
  users,
} from '@bloom-kigali/db/schema';
import { requireUser } from '@/lib/auth/session';

type StockPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    page?: string;
    mobilePage?: string;
    received?: string;
    fixed?: string;
    request?: string;
  }>;
};

const DESKTOP_PAGE_SIZE = 10;
const MOBILE_PAGE_SIZE = 5;

function positiveInteger(
  value: string | undefined,
) {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return 1;
  }

  return parsed;
}

function stockState(
  quantity: number,
  minQuantity: number,
) {
  if (quantity <= 0) {
    return {
      text: 'Out of stock',
      className: 'text-[var(--danger)]',
    };
  }

  if (quantity <= minQuantity) {
    return {
      text: 'Low stock',
      className: 'text-[var(--danger)]',
    };
  }

  return {
    text: 'In stock',
    className: 'text-[var(--success)]',
  };
}

function productDetails(item: {
  customerType: string;
  ageStage: string | null;
  size: string | null;
  color: string | null;
}) {
  return [
    item.customerType,
    item.ageStage,
    item.size,
    item.color,
  ]
    .filter(Boolean)
    .join(' / ');
}

function money(
  value: number,
) {
  return `RWF ${new Intl.NumberFormat(
    'en-RW',
    {
      maximumFractionDigits: 0,
    },
  ).format(value)}`;
}

function quantityLabel(
  quantity: number,
  unit: string,
) {
  if (quantity <= 0) {
    return '0';
  }

  if (quantity === 1) {
    return `1 ${unit}`;
  }

  return `${quantity} ${unit}s`;
}

function buildPageHref({
  q,
  status,
  page,
  mobile,
}: {
  q: string;
  status: string;
  page: number;
  mobile: boolean;
}) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (status) {
    params.set('status', status);
  }

  if (page > 1) {
    params.set(
      mobile ? 'mobilePage' : 'page',
      String(page),
    );
  }

  const query = params.toString();

  return query
    ? `/stock?${query}`
    : '/stock';
}

function buildFilterHref(
  q: string,
  status: string,
) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (status) {
    params.set('status', status);
  }

  const query = params.toString();

  return query
    ? `/stock?${query}`
    : '/stock';
}

function formatReceivedAt(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: 'Africa/Kigali',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(value);
}

export default async function StockPage({
  searchParams,
}: StockPageProps) {
  const params = await searchParams;
  const user = await requireUser();

  const q = params?.q?.trim() || '';

  const selectedStatus =
    params?.status === 'LOW' ||
    params?.status === 'OUT'
      ? params.status
      : '';

  const requestedDesktopPage =
    positiveInteger(params?.page);

  const requestedMobilePage =
    positiveInteger(
      params?.mobilePage,
    );

  const baseCondition = and(
    eq(products.status, 'ACTIVE'),
    eq(products.itemType, 'PRODUCT'),
  );

  const searchCondition = q
    ? or(
        ilike(
          products.name,
          `%${q}%`,
        ),
        ilike(
          products.category,
          `%${q}%`,
        ),
        ilike(
          products.customerType,
          `%${q}%`,
        ),
        ilike(
          products.ageStage,
          `%${q}%`,
        ),
        ilike(
          products.size,
          `%${q}%`,
        ),
        ilike(
          products.color,
          `%${q}%`,
        ),
      )
    : undefined;

  const stockFilterCondition =
    selectedStatus === 'OUT'
      ? lte(products.quantity, 0)
      : selectedStatus === 'LOW'
        ? and(
            gt(products.quantity, 0),
            lte(
              products.quantity,
              products.minQuantity,
            ),
          )
        : undefined;

  const filteredCondition = and(
    baseCondition,
    searchCondition,
    stockFilterCondition,
  );

  const [
    totalResult,
    lowResult,
    outResult,
    filteredResult,
  ] = await Promise.all([
    db
      .select({
        value: count(),
      })
      .from(products)
      .where(baseCondition),

    db
      .select({
        value: count(),
      })
      .from(products)
      .where(
        and(
          baseCondition,
          gt(products.quantity, 0),
          lte(
            products.quantity,
            products.minQuantity,
          ),
        ),
      ),

    db
      .select({
        value: count(),
      })
      .from(products)
      .where(
        and(
          baseCondition,
          lte(products.quantity, 0),
        ),
      ),

    db
      .select({
        value: count(),
      })
      .from(products)
      .where(filteredCondition),
  ]);

  const totalProducts = Number(
    totalResult[0]?.value || 0,
  );

  const lowStockCount = Number(
    lowResult[0]?.value || 0,
  );

  const outOfStockCount = Number(
    outResult[0]?.value || 0,
  );

  const filteredCount = Number(
    filteredResult[0]?.value || 0,
  );

  let inventoryCost = 0;
  let retailValue = 0;
  let potentialGrossProfit = 0;
  let grossMarginPercent = 0;

  if (user.role === 'OWNER') {
    const [valuation] = await db
      .select({
        inventoryCost: sql<string>`
          COALESCE(
            SUM(
              ${products.quantity}
              * ${products.buyingPrice}::numeric
            ),
            0
          )
        `,
        retailValue: sql<string>`
          COALESCE(
            SUM(
              ${products.quantity}
              * ${products.sellingPrice}::numeric
            ),
            0
          )
        `,
      })
      .from(products)
      .where(
        and(
          baseCondition,
          gt(products.quantity, 0),
        ),
      );

    inventoryCost = Number(
      valuation?.inventoryCost || 0,
    );

    retailValue = Number(
      valuation?.retailValue || 0,
    );

    potentialGrossProfit =
      retailValue - inventoryCost;

    grossMarginPercent =
      retailValue > 0
        ? (
            potentialGrossProfit /
            retailValue
          ) * 100
        : 0;
  }

  const desktopPageCount = Math.max(
    1,
    Math.ceil(
      filteredCount /
        DESKTOP_PAGE_SIZE,
    ),
  );

  const mobilePageCount = Math.max(
    1,
    Math.ceil(
      filteredCount /
        MOBILE_PAGE_SIZE,
    ),
  );

  const desktopPage = Math.min(
    requestedDesktopPage,
    desktopPageCount,
  );

  const mobilePage = Math.min(
    requestedMobilePage,
    mobilePageCount,
  );

  const desktopOffset =
    (desktopPage - 1) *
    DESKTOP_PAGE_SIZE;

  const mobileOffset =
    (mobilePage - 1) *
    MOBILE_PAGE_SIZE;

  const productSelection = {
    id: products.id,
    name: products.name,
    category: products.category,
    customerType:
      products.customerType,
    ageStage: products.ageStage,
    size: products.size,
    color: products.color,
    unit: products.unit,
    quantity: products.quantity,
    minQuantity:
      products.minQuantity,
  };

  const [
    desktopItems,
    mobileItems,
    recentArrivals,
  ] = await Promise.all([
    db
      .select(productSelection)
      .from(products)
      .where(filteredCondition)
      .orderBy(
        desc(products.createdAt),
      )
      .limit(DESKTOP_PAGE_SIZE)
      .offset(desktopOffset),

    db
      .select(productSelection)
      .from(products)
      .where(filteredCondition)
      .orderBy(
        desc(products.createdAt),
      )
      .limit(MOBILE_PAGE_SIZE)
      .offset(mobileOffset),

    db
      .select({
        id: stockArrivals.id,
        productName:
          stockArrivals.productName,
        quantityReceived:
          stockArrivals.quantityReceived,
        supplierName:
          stockArrivals.supplierName,
        reference:
          stockArrivals.reference,
        arrivedAt:
          stockArrivals.arrivedAt,
        receivedBy: users.name,
        unit: products.unit,
      })
      .from(stockArrivals)
      .innerJoin(
        users,
        eq(
          stockArrivals.receivedByUserId,
          users.id,
        ),
      )
      .innerJoin(
        products,
        eq(
          stockArrivals.productId,
          products.id,
        ),
      )
      .orderBy(
        desc(stockArrivals.arrivedAt),
      )
      .limit(5),
  ]);

  const desktopStart =
    filteredCount === 0
      ? 0
      : desktopOffset + 1;

  const desktopEnd =
    desktopOffset +
    desktopItems.length;

  const mobileStart =
    filteredCount === 0
      ? 0
      : mobileOffset + 1;

  const mobileEnd =
    mobileOffset +
    mobileItems.length;

  const filters = [
    {
      label: 'All',
      value: '',
    },
    {
      label: 'Low stock',
      value: 'LOW',
    },
    {
      label: 'Out of stock',
      value: 'OUT',
    },
  ];

  return (
    <section className="space-y-4">
      {params?.received === '1' ? (
        <div className="rounded-lg border border-[var(--success)] px-4 py-3 text-sm font-bold text-[var(--success)]">
          Stock received successfully.
        </div>
      ) : null}

      {params?.fixed === '1' ? (
        <div className="rounded-lg border border-[var(--success)] px-4 py-3 text-sm font-bold text-[var(--success)]">
          Stock mistake fixed.
        </div>
      ) : null}

      {params?.request === '1' ? (
        <div className="rounded-lg border border-[var(--success)] px-4 py-3 text-sm font-bold text-[var(--success)]">
          Request sent to the owner.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Inventory
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--text)]">
              Stock list
            </h2>

            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              Current quantities available
              for sale.
            </p>
          </div>

          <Link
            href="/stock/receive"
            prefetch
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)]"
          >
            <Plus className="h-4 w-4" />
            Receive stock
          </Link>
        </div>

        <div className="grid grid-cols-3 border-t border-[var(--border)]">
          <div className="border-r border-[var(--border)] px-4 py-3 sm:px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Products
            </p>

            <p className="mt-1 text-lg font-black text-[var(--text)]">
              {totalProducts}
            </p>
          </div>

          <div className="border-r border-[var(--border)] px-4 py-3 sm:px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Low stock
            </p>

            <p className="mt-1 text-lg font-black text-[var(--text)]">
              {lowStockCount}
            </p>
          </div>

          <div className="px-4 py-3 sm:px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Out of stock
            </p>

            <p className="mt-1 text-lg font-black text-[var(--text)]">
              {outOfStockCount}
            </p>
          </div>
        </div>

        {user.role === 'OWNER' ? (
          <div className="grid grid-cols-1 border-t border-[var(--border)] bg-[var(--surface)] sm:grid-cols-3">
            <div className="border-b border-[var(--border)] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Inventory cost
              </p>

              <p className="mt-1.5 text-lg font-black tabular-nums text-[var(--text)]">
                {money(inventoryCost)}
              </p>

              <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                At average buying cost
              </p>
            </div>

            <div className="border-b border-[var(--border)] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Retail value
              </p>

              <p className="mt-1.5 text-lg font-black tabular-nums text-[var(--text)]">
                {money(retailValue)}
              </p>

              <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                At current selling prices
              </p>
            </div>

            <div className="px-5 py-4 sm:px-6">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Potential gross profit
              </p>

              <p className="mt-1.5 text-lg font-black tabular-nums text-[var(--text)]">
                {money(
                  potentialGrossProfit,
                )}
              </p>

              <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                Before expenses /{' '}
                {grossMarginPercent.toFixed(
                  1,
                )}
                % margin
              </p>
            </div>
          </div>
        ) : null}

        <form className="flex flex-col gap-2 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:px-6">
          {selectedStatus ? (
            <input
              type="hidden"
              name="status"
              value={selectedStatus}
            />
          ) : null}

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

            <input
              name="q"
              defaultValue={q}
              placeholder="Search product, category, age, size, or color"
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-10 pr-3 text-sm font-bold text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
            />
          </div>

          <button className="h-11 rounded-lg border border-[var(--border)] px-5 text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)]">
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-5 py-3 sm:px-6">
          {filters.map((filter) => {
            const active =
              selectedStatus ===
              filter.value;

            return (
              <Link
                key={filter.label}
                href={buildFilterHref(
                  q,
                  filter.value,
                )}
                prefetch
                className={
                  active
                    ? 'inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-xs font-black text-white'
                    : 'inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)]'
                }
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      {filteredCount === 0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-6 sm:px-6">
          <h3 className="text-base font-black text-[var(--text)]">
            No stock found
          </h3>

          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {q
              ? 'Try another search or filter.'
              : 'No products match this stock filter.'}
          </p>
        </section>
      ) : (
        <>
          <section className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] lg:block">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                <tr>
                  <th className="w-[58%] px-6 py-3">
                    Product
                  </th>

                  <th className="w-[20%] px-6 py-3">
                    Stock
                  </th>

                  <th className="w-[22%] px-6 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {desktopItems.map(
                  (item) => {
                    const stock =
                      stockState(
                        item.quantity,
                        item.minQuantity,
                      );

                    const details =
                      productDetails(item);

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-[var(--surface)]"
                      >
                        <td className="px-6 py-4 align-middle">
                          <p className="text-sm font-black text-[var(--text)]">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                            {item.category}
                          </p>

                          {details ? (
                            <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">
                              {details}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-6 py-4 align-middle">
                          <p className="text-sm font-black text-[var(--text)]">
                            {quantityLabel(
                              item.quantity,
                              item.unit,
                            )}
                          </p>

                          <p
                            className={`mt-1 text-xs font-black ${stock.className}`}
                          >
                            {stock.text}
                          </p>
                        </td>

                        <td className="px-6 py-4 align-middle">
                          <div className="flex justify-end">
                            <Link
                              href={`/stock/receive?product=${item.id}`}
                              prefetch
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--primary)] px-4 text-xs font-black text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
                            >
                              Receive stock
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </section>

          <section className="space-y-3 lg:hidden">
            {mobileItems.map(
              (item) => {
                const stock =
                  stockState(
                    item.quantity,
                    item.minQuantity,
                  );

                const details =
                  productDetails(item);

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[var(--text)]">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                            {item.category}
                          </p>
                        </div>

                        <p
                          className={`shrink-0 text-xs font-black ${stock.className}`}
                        >
                          {stock.text}
                        </p>
                      </div>

                      {details ? (
                        <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
                          {details}
                        </p>
                      ) : null}

                      <div className="mt-4 border-t border-[var(--border)] pt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                          Stock
                        </p>

                        <p className="mt-1 text-sm font-black text-[var(--text)]">
                          {quantityLabel(
                            item.quantity,
                            item.unit,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] px-5 py-3">
                      <Link
                        href={`/stock/receive?product=${item.id}`}
                        prefetch
                        className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--primary)] text-xs font-black text-[var(--primary)]"
                      >
                        Receive stock
                      </Link>
                    </div>
                  </article>
                );
              },
            )}
          </section>

          <div
            className={
              desktopPageCount > 1
                ? 'hidden items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 lg:flex'
                : 'hidden'
            }
          >
            <p className="text-xs font-bold text-[var(--muted)]">
              Showing {desktopStart}–
              {desktopEnd} of{' '}
              {filteredCount}
            </p>

            <div className="flex items-center gap-3">
              {desktopPage > 1 ? (
                <Link
                  href={buildPageHref({
                    q,
                    status:
                      selectedStatus,
                    page:
                      desktopPage - 1,
                    mobile: false,
                  })}
                  prefetch
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-xs font-black text-[var(--text)]"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-xs font-black text-[var(--muted)] opacity-50">
                  Previous
                </span>
              )}

              <p className="min-w-[92px] text-center text-xs font-black text-[var(--text)]">
                Page {desktopPage} of{' '}
                {desktopPageCount}
              </p>

              {desktopPage <
              desktopPageCount ? (
                <Link
                  href={buildPageHref({
                    q,
                    status:
                      selectedStatus,
                    page:
                      desktopPage + 1,
                    mobile: false,
                  })}
                  prefetch
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-xs font-black text-[var(--text)]"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-xs font-black text-[var(--muted)] opacity-50">
                  Next
                </span>
              )}
            </div>
          </div>

          <div
            className={
              mobilePageCount > 1
                ? 'rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 lg:hidden'
                : 'hidden'
            }
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-[var(--muted)]">
                {mobileStart}–
                {mobileEnd} of{' '}
                {filteredCount}
              </p>

              <p className="text-xs font-black text-[var(--text)]">
                Page {mobilePage} of{' '}
                {mobilePageCount}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {mobilePage > 1 ? (
                <Link
                  href={buildPageHref({
                    q,
                    status:
                      selectedStatus,
                    page:
                      mobilePage - 1,
                    mobile: true,
                  })}
                  prefetch
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] text-xs font-black text-[var(--text)]"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] text-xs font-black text-[var(--muted)] opacity-50">
                  Previous
                </span>
              )}

              {mobilePage <
              mobilePageCount ? (
                <Link
                  href={buildPageHref({
                    q,
                    status:
                      selectedStatus,
                    page:
                      mobilePage + 1,
                    mobile: true,
                  })}
                  prefetch
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] text-xs font-black text-[var(--text)]"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] text-xs font-black text-[var(--muted)] opacity-50">
                  Next
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
            Stock history
          </p>

          <h3 className="mt-1 text-base font-black text-[var(--text)]">
            Recently received
          </h3>
        </div>

        {recentArrivals.length === 0 ? (
          <div className="border-t border-[var(--border)] px-5 py-5 sm:px-6">
            <p className="text-sm font-bold text-[var(--muted)]">
              No stock received yet.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden border-t border-[var(--border)] lg:block">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  <tr>
                    <th className="w-[38%] px-6 py-3">
                      Product
                    </th>

                    <th className="w-[16%] px-6 py-3">
                      Received
                    </th>

                    <th className="w-[24%] px-6 py-3">
                      Recorded by
                    </th>

                    <th className="w-[22%] px-6 py-3">
                      When
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border)]">
                  {recentArrivals.map(
                    (arrival) => {
                      const details = [
                        arrival.supplierName,
                        arrival.reference,
                      ]
                        .filter(Boolean)
                        .join(' / ');

                      return (
                        <tr key={arrival.id}>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-[var(--text)]">
                              {
                                arrival.productName
                              }
                            </p>

                            {details ? (
                              <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                                {details}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-6 py-4 text-sm font-black text-[var(--text)]">
                            +
                            {quantityLabel(
                              arrival.quantityReceived,
                              arrival.unit,
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm font-bold text-[var(--text)]">
                            {
                              arrival.receivedBy
                            }
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-[var(--muted)]">
                              {formatReceivedAt(
                                arrival.arrivedAt,
                              )}
                            </p>

                            <Link
                              href={`/stock/received/${arrival.id}/fix`}
                              prefetch
                              className="mt-2 inline-flex text-xs font-black text-[var(--primary)] hover:text-[var(--primary-strong)]"
                            >
                              {user.role === 'OWNER'
                                ? 'Fix mistake'
                                : 'Ask owner to fix'}
                            </Link>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)] lg:hidden">
              {recentArrivals.map(
                (arrival) => {
                  const details = [
                    arrival.supplierName,
                    arrival.reference,
                  ]
                    .filter(Boolean)
                    .join(' / ');

                  return (
                    <article
                      key={arrival.id}
                      className="px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[var(--text)]">
                            {
                              arrival.productName
                            }
                          </p>

                          {details ? (
                            <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">
                              {details}
                            </p>
                          ) : null}
                        </div>

                        <p className="shrink-0 text-sm font-black text-[var(--success)]">
                          +
                          {quantityLabel(
                            arrival.quantityReceived,
                            arrival.unit,
                          )}
                        </p>
                      </div>

                      <p className="mt-2 text-xs font-bold text-[var(--muted)]">
                        {arrival.receivedBy}{' '}
                        /{' '}
                        {formatReceivedAt(
                          arrival.arrivedAt,
                        )}
                      </p>

                      <Link
                        href={`/stock/received/${arrival.id}/fix`}
                        prefetch
                        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--border)] text-xs font-black text-[var(--text)]"
                      >
                        {user.role === 'OWNER'
                          ? 'Fix mistake'
                          : 'Ask owner to fix'}
                      </Link>
                    </article>
                  );
                },
              )}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
