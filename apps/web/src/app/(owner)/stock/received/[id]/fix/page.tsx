import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  and,
  eq,
} from 'drizzle-orm';
import { db } from '@bloom-kigali/db/client';
import {
  corrections,
  products,
  stockArrivals,
} from '@bloom-kigali/db/schema';
import { requireUser } from '@/lib/auth/session';
import { submitStockFixAction } from '@/lib/stock/fixes';

type FixStockPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams?: Promise<{
    error?: string;
  }>;
};

function formatMoney(value: string) {
  return new Intl.NumberFormat(
    'en-RW',
    {
      maximumFractionDigits: 0,
    },
  ).format(Number(value || 0));
}

export default async function FixStockPage({
  params,
  searchParams,
}: FixStockPageProps) {
  const user = await requireUser();

  const { id } = await params;
  const query = await searchParams;

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
      unit: products.unit,
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
      eq(stockArrivals.id, id),
    )
    .limit(1);

  if (!receipt) {
    notFound();
  }

  const [pendingRequest] =
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
            receipt.id,
          ),
          eq(
            corrections.status,
            'PENDING',
          ),
        ),
      )
      .limit(1);

  const isOwner =
    user.role === 'OWNER';

  const pluralUnit =
    receipt.quantityReceived === 1
      ? receipt.unit
      : `${receipt.unit}s`;

  return (
    <section className="mx-auto max-w-4xl">
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-black text-[var(--text)]">
            {isOwner
              ? 'Fix mistake'
              : 'Ask owner to fix'}
          </h2>

          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {receipt.productName}
          </p>
        </div>

        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <p className="text-xs font-bold text-[var(--muted)]">
            Currently recorded
          </p>

          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p className="font-black text-[var(--text)]">
              {receipt.quantityReceived}{' '}
              {pluralUnit}
            </p>

            <p className="font-black text-[var(--text)]">
              RWF{' '}
              {formatMoney(
                receipt.buyingPrice,
              )}{' '}
              per {receipt.unit}
            </p>

            {receipt.supplierName ? (
              <p className="font-bold text-[var(--muted)]">
                {receipt.supplierName}
              </p>
            ) : null}
          </div>
        </div>

        {query?.error ? (
          <div className="mx-5 mt-5 rounded-lg border border-[var(--danger)] px-4 py-3 text-sm font-bold text-[var(--danger)] sm:mx-6">
            {query.error}
          </div>
        ) : null}

        {!isOwner && pendingRequest ? (
          <div className="mx-5 mt-5 rounded-lg border border-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--text)] sm:mx-6">
            A request for this stock entry is already waiting for the owner.
          </div>
        ) : null}

        <form
          action={submitStockFixAction}
          className="space-y-5 px-5 py-5 sm:px-6"
        >
          <input
            type="hidden"
            name="receiptId"
            value={receipt.id}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="quantityReceived"
                className="text-sm font-black text-[var(--text)]"
              >
                Quantity received
              </label>

              <input
                id="quantityReceived"
                name="quantityReceived"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={
                  receipt.quantityReceived
                }
                className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-bold text-[var(--text)] outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label
                htmlFor="buyingPrice"
                className="text-sm font-black text-[var(--text)]"
              >
                Buying price per{' '}
                {receipt.unit}
              </label>

              <div className="mt-2 flex h-11 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] focus-within:border-[var(--primary)]">
                <span className="flex items-center border-r border-[var(--border)] px-3 text-xs font-black text-[var(--muted)]">
                  RWF
                </span>

                <input
                  id="buyingPrice"
                  name="buyingPrice"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={Number(
                    receipt.buyingPrice,
                  )}
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-[var(--text)] outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="supplierName"
              className="text-sm font-black text-[var(--text)]"
            >
              Supplier{' '}
              <span className="font-bold text-[var(--muted)]">
                (optional)
              </span>
            </label>

            <input
              id="supplierName"
              name="supplierName"
              defaultValue={
                receipt.supplierName ||
                ''
              }
              placeholder="Supplier name"
              className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-bold text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="reason"
              className="text-sm font-black text-[var(--text)]"
            >
              {isOwner
                ? 'Why are you changing this?'
                : 'What was entered wrong?'}
            </label>

            <textarea
              id="reason"
              name="reason"
              rows={3}
              required
              placeholder={
                isOwner
                  ? 'Example: I entered 30 instead of 25'
                  : 'Example: I entered 30 instead of 25'
              }
              className="mt-2 min-h-24 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm font-bold text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
            />
          </div>

          <div className="grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-[1fr_auto]">
            <Link
              href="/stock"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-5 text-sm font-black text-[var(--text)]"
            >
              Back
            </Link>

            <button
              type="submit"
              disabled={
                !isOwner &&
                Boolean(pendingRequest)
              }
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-6 text-sm font-black text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isOwner
                ? 'Save fix'
                : pendingRequest
                  ? 'Request sent'
                  : 'Send request'}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
