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
} from 'drizzle-orm';
import {
  Edit,
  Plus,
  Search,
} from 'lucide-react';
import { db } from '@bloom-kigali/db/client';
import { products } from '@bloom-kigali/db/schema';
import { requireUser } from '@/lib/auth/session';
import { HideItemButton } from './hide-item-button';

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    mobilePage?: string;
    updated?: string;
    request?: string;
  }>;
};

const DESKTOP_PAGE_SIZE = 10;
const MOBILE_PAGE_SIZE = 5;

function money(value: string | number) {
  return `RWF ${Number(value).toLocaleString('en-US')}`;
}

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

function stockQuantity(
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

function buildDesktopPageHref(
  q: string,
  page: number,
) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return query
    ? `/products?${query}`
    : '/products';
}

function buildMobilePageHref(
  q: string,
  page: number,
) {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (page > 1) {
    params.set(
      'mobilePage',
      String(page),
    );
  }

  const query = params.toString();

  return query
    ? `/products?${query}`
    : '/products';
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const user = await requireUser();
  const canHideProducts = user.role === 'OWNER';

  const params = await searchParams;

  const q = params?.q?.trim() || '';

  const requestedDesktopPage =
    positiveInteger(params?.page);

  const requestedMobilePage =
    positiveInteger(params?.mobilePage);

  const baseCondition = and(
    eq(products.status, 'ACTIVE'),
    eq(products.itemType, 'PRODUCT'),
  );

  const searchCondition = q
    ? or(
        ilike(products.name, `%${q}%`),
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
        ilike(products.size, `%${q}%`),
        ilike(products.color, `%${q}%`),
      )
    : undefined;

  const filteredCondition = and(
    baseCondition,
    searchCondition,
  );

  /*
   * Counts are performed by PostgreSQL.
   *
   * These catalog totals do not change when
   * someone searches for one product.
   */
  const [
    totalResult,
    lowStockResult,
    outOfStockResult,
    filteredResult,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(products)
      .where(baseCondition),

    db
      .select({ value: count() })
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
      .select({ value: count() })
      .from(products)
      .where(
        and(
          baseCondition,
          lte(products.quantity, 0),
        ),
      ),

    db
      .select({ value: count() })
      .from(products)
      .where(filteredCondition),
  ]);

  const totalProducts =
    Number(totalResult[0]?.value || 0);

  const lowStockCount =
    Number(lowStockResult[0]?.value || 0);

  const outOfStockCount =
    Number(outOfStockResult[0]?.value || 0);

  const filteredCount =
    Number(filteredResult[0]?.value || 0);

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

  /*
   * Both result sets are deliberately bounded.
   *
   * Desktop never retrieves more than 10.
   * Mobile never retrieves more than 5.
   *
   * We do not load the full catalog into memory.
   */
  const [
    desktopItems,
    mobileItems,
  ] = await Promise.all([
    db
      .select()
      .from(products)
      .where(filteredCondition)
      .orderBy(
        desc(products.createdAt),
      )
      .limit(DESKTOP_PAGE_SIZE)
      .offset(desktopOffset),

    db
      .select()
      .from(products)
      .where(filteredCondition)
      .orderBy(
        desc(products.createdAt),
      )
      .limit(MOBILE_PAGE_SIZE)
      .offset(mobileOffset),
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

  return (
    <section className="space-y-4">
      {params?.updated === '1' ? (
        <div className="rounded-lg border border-[var(--success)] px-4 py-3 text-sm font-bold text-[var(--success)]">
          Product updated.
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
              Catalog
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--text)]">
              Product list
            </h2>

            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              Products available for sale.
            </p>
          </div>

          <Link
            href="/products/new"
            prefetch
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)]"
          >
            <Plus className="h-4 w-4" />
            Add product
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

        <form className="flex flex-col gap-2 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:px-6">
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
      </section>

      {filteredCount === 0 ? (
        <section className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-lg font-black text-[var(--text)]">
              {q
                ? 'No matching products'
                : 'No products yet'}
            </h3>

            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {q
                ? 'Try another search.'
                : 'Add the first product Bloom Kigali sells.'}
            </p>
          </div>

          {!q ? (
            <Link
              href="/products/new"
              prefetch
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--primary)] px-4 text-sm font-black text-[var(--primary)]"
            >
              <Plus className="h-4 w-4" />
              Add product
            </Link>
          ) : null}
        </section>
      ) : (
        <>
          {/* Desktop: 10 products per database page */}
          <section className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] lg:block">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                <tr>
                  <th className="w-[48%] px-6 py-3">
                    Product
                  </th>

                  <th className="w-[18%] px-6 py-3">
                    Selling price
                  </th>

                  <th className="w-[16%] px-6 py-3">
                    Stock
                  </th>

                  <th className="w-[18%] px-6 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {desktopItems.map((item) => {
                  const stock = stockState(
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
                          {money(
                            item.sellingPrice,
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-4 align-middle">
                        <p className="text-sm font-black text-[var(--text)]">
                          {stockQuantity(
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
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/products/${item.id}/edit`}
                            prefetch
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)]"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            {user.role === 'OWNER'
                              ? 'Edit product'
                              : 'Ask owner to edit'}
                          </Link>

                          {canHideProducts ? (
                            <HideItemButton
                              itemId={item.id}
                              itemName={item.name}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Mobile/tablet: 5 products per database page */}
          <section className="space-y-3 lg:hidden">
            {mobileItems.map((item) => {
              const stock = stockState(
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

                    <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--border)]">
                      <div className="border-r border-[var(--border)] px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                          Selling price
                        </p>

                        <p className="mt-1 text-sm font-black text-[var(--text)]">
                          {money(
                            item.sellingPrice,
                          )}
                        </p>
                      </div>

                      <div className="px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                          Stock
                        </p>

                        <p className="mt-1 text-sm font-black text-[var(--text)]">
                          {stockQuantity(
                            item.quantity,
                            item.unit,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={
                      canHideProducts
                        ? "grid grid-cols-2 gap-2 border-t border-[var(--border)] px-5 py-3"
                        : "grid grid-cols-1 gap-2 border-t border-[var(--border)] px-5 py-3"
                    }
                  >
                    <Link
                      href={`/products/${item.id}/edit`}
                      prefetch
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)]"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      {user.role === 'OWNER'
                        ? 'Edit product'
                        : 'Ask owner to edit'}
                    </Link>

                    {canHideProducts ? (
                      <div className="[&_button]:h-10 [&_button]:w-full">
                        <HideItemButton
                          itemId={item.id}
                          itemName={item.name}
                        />
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>

          {/* Desktop pagination */}
          <div
            className={
              desktopPageCount > 1
                ? "hidden items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 lg:flex"
                : "hidden"
            }
          >
            <p className="text-xs font-bold text-[var(--muted)]">
              Showing {desktopStart}–{desktopEnd} of{' '}
              {filteredCount}
            </p>

            <div className="flex items-center gap-3">
              {desktopPage > 1 ? (
                <Link
                  href={buildDesktopPageHref(
                    q,
                    desktopPage - 1,
                  )}
                  prefetch
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)]"
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
                  href={buildDesktopPageHref(
                    q,
                    desktopPage + 1,
                  )}
                  prefetch
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-xs font-black text-[var(--text)] transition hover:border-[var(--primary)]"
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

          {/* Mobile pagination */}
          <div
            className={
              mobilePageCount > 1
                ? "rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 lg:hidden"
                : "hidden"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-[var(--muted)]">
                {mobileStart}–{mobileEnd} of{' '}
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
                  href={buildMobilePageHref(
                    q,
                    mobilePage - 1,
                  )}
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
                  href={buildMobilePageHref(
                    q,
                    mobilePage + 1,
                  )}
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
    </section>
  );
}
