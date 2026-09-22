import Link from 'next/link';
import {
  and,
  asc,
  eq,
  gt,
} from 'drizzle-orm';
import {
  ArrowLeft,
} from 'lucide-react';
import { db } from '@bloom-kigali/db/client';
import {
  cashDrawers,
  customers,
  products,
} from '@bloom-kigali/db/schema';
import { requireUser } from '@/lib/auth/session';
import { SaleForm } from '../sale-form';

export default async function NewSalePage() {
  const user = await requireUser();

  const [
    items,
    customerList,
    openDrawer,
  ] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        customerType:
          products.customerType,
        ageStage:
          products.ageStage,
        size: products.size,
        color: products.color,
        sellingPrice:
          products.sellingPrice,
        quantity:
          products.quantity,
        unit: products.unit,
      })
      .from(products)
      .where(
        and(
          eq(
            products.status,
            'ACTIVE',
          ),
          eq(
            products.itemType,
            'PRODUCT',
          ),
          gt(
            products.quantity,
            0,
          ),
        ),
      )
      .orderBy(
        asc(products.name),
      ),

    db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
      })
      .from(customers)
      .where(
        eq(
          customers.status,
          'ACTIVE',
        ),
      )
      .orderBy(
        asc(customers.name),
      ),

    db.query.cashDrawers.findFirst({
      where: eq(
        cashDrawers.status,
        'OPEN',
      ),
    }),
  ]);

  return (
    <section className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Sales
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--text)]">
              New sale
            </h2>

            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              Add what was sold and record how the customer paid.
            </p>
          </div>

          <Link
            href="/sales"
            prefetch
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sales
          </Link>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-6 sm:px-6">
          <p className="text-sm font-black text-[var(--text)]">
            No stock available to sell
          </p>

          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            Receive stock before recording a sale.
          </p>

          <Link
            href="/stock/receive"
            prefetch
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-[var(--primary)] px-4 text-sm font-black text-[var(--primary)]"
          >
            Receive stock
          </Link>
        </section>
      ) : (
        <SaleForm
          items={items}
          customers={customerList}
          hasOpenDrawer={
            Boolean(openDrawer)
          }
          canGiveDiscount={
            user.role === 'OWNER' ||
            user.role === 'EMPLOYEE'
          }
        />
      )}
    </section>
  );
}
