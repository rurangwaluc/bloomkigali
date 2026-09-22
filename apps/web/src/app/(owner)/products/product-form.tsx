'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  createProductAction,
  updateProductAction,
} from '@/lib/products/actions';

type ProductFormProps = {
  backHref?: string;
  userRole?: 'OWNER' | 'EMPLOYEE';
  unitLocked?: boolean;
  hasPendingRequest?: boolean;
  product?: {
    id: string;
    itemType: 'PRODUCT' | 'SERVICE';
    name: string;
    category: string;
    customerType: string;
    ageStage: string | null;
    size: string | null;
    color: string | null;
    unit: string;
    sellingPrice: string;
    minQuantity: number;
    notes: string | null;
  };
};

const fieldClass =
  'h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-bold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)]';

const labelClass =
  'block text-[13px] font-black text-[var(--text)]';


const unitOptions = [
  { label: 'Piece', value: 'piece' },
  { label: 'Pair', value: 'pair' },
  { label: 'Set', value: 'set' },
  { label: 'Pack', value: 'pack' },
];

export function ProductForm({
  product,
  backHref = '/products',
  userRole = 'OWNER',
  unitLocked = false,
  hasPendingRequest = false,
}: ProductFormProps) {
  const isEditing = Boolean(product);

  const isEmployeeEdit =
    isEditing &&
    userRole === 'EMPLOYEE';
  const action = product
    ? updateProductAction.bind(null, product.id)
    : createProductAction;

  const [state, formAction, pending] =
    useActionState(action, {});

  return (
    <form
      action={formAction}
      className="mx-auto w-full max-w-6xl"
    >
      <input
        type="hidden"
        name="itemType"
        value="PRODUCT"
      />

      {product && hasPendingRequest ? (
        <div className="mb-4 rounded-lg border border-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--text)]">
          {userRole === 'OWNER' ? (
            <>
              A request is waiting for this product.{' '}
              <Link
                href="/requests"
                className="font-black text-[var(--primary)]"
              >
                Review request
              </Link>
            </>
          ) : (
            'A request for this product is already waiting for the owner.'
          )}
        </div>
      ) : null}

      <div className="product-form-layout">
        {/* Main product information */}
        <section className="product-form-main overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <header className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              Product details
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--text)]">
              {product
                ? isEmployeeEdit
                  ? 'Ask owner to edit'
                  : 'Edit product'
                : 'What are you selling?'}
            </h2>

            <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">
              {product
                ? isEmployeeEdit
                  ? 'Change what needs updating. The owner will review it before anything changes.'
                  : 'Change the saved product details.'
                : 'Add the details used to find this product during a sale.'}
            </p>
          </header>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div>
              <label
                htmlFor="name"
                className={labelClass}
              >
                Product name
              </label>

              <input
                id="name"
                name="name"
                defaultValue={product?.name || ''}
                placeholder="Baby cotton romper"
                required
                autoFocus={!product}
                className={`${fieldClass} mt-2`}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className={labelClass}
                >
                  Category
                </label>

                <input
                  id="category"
                  name="category"
                        defaultValue={product?.category || ''}
                  placeholder="Enter category"
                  required
                  className={`${fieldClass} mt-2`}
                />

              </div>

              <div>
                <label
                  htmlFor="customerType"
                  className={labelClass}
                >
                  For
                </label>

                <select
                  id="customerType"
                  name="customerType"
                  defaultValue={
                    product?.customerType || 'Unisex'
                  }
                  required
                  className={`${fieldClass} mt-2`}
                >
                  <option value="Girl">Girl</option>
                  <option value="Boy">Boy</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="ageStage"
                    className={labelClass}
                  >
                    Age / stage
                  </label>

                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                    Optional
                  </span>
                </div>

                <input
                  id="ageStage"
                  name="ageStage"
                  type="text"
                  maxLength={60}
                  defaultValue={
                    product?.ageStage || ''
                  }
                  placeholder="Example: 0–3 months"
                  className={`${fieldClass} mt-2`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="size"
                    className={labelClass}
                  >
                    Size
                  </label>

                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                    Optional
                  </span>
                </div>

                <input
                  id="size"
                  name="size"
                  defaultValue={product?.size || ''}
                  placeholder="0–3M, 22, Small"
                  className={`${fieldClass} mt-2`}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="color"
                    className={labelClass}
                  >
                    Color
                  </label>

                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                    Optional
                  </span>
                </div>

                <input
                  id="color"
                  name="color"
                  defaultValue={product?.color || ''}
                  placeholder="White, pink, blue"
                  className={`${fieldClass} mt-2`}
                />
              </div>

              <div>
                <label
                  htmlFor="unit"
                  className={labelClass}
                >
                  Count by
                </label>

                {product && unitLocked ? (
                  <input
                    type="hidden"
                    name="unit"
                    value={product.unit}
                  />
                ) : null}

                <select
                  id="unit"
                  name={
                    product && unitLocked
                      ? undefined
                      : 'unit'
                  }
                  defaultValue={
                    product?.unit || 'piece'
                  }
                  disabled={
                    Boolean(
                      product &&
                        unitLocked,
                    )
                  }
                  required={
                    !(
                      product &&
                      unitLocked
                    )
                  }
                  className={`${fieldClass} mt-2 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {unitOptions.map((unit) => (
                    <option
                      key={unit.value}
                      value={unit.value}
                    >
                      {unit.label}
                    </option>
                  ))}
                </select>

                {product && unitLocked ? (
                  <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
                    Count by cannot be changed after stock or sales have been recorded.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="notes"
                  className={labelClass}
                >
                  Notes
                </label>

                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Optional
                </span>
              </div>

              <textarea
                id="notes"
                name="notes"
                defaultValue={product?.notes || ''}
                rows={2}
                placeholder="Anything useful to remember about this product"
                className="mt-2 min-h-[80px] w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-bold leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
              />
            </div>
          </div>
        </section>

        {/* Selling settings */}
        <aside className="product-form-side space-y-4">
          <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <header className="border-b border-[var(--border)] px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
                Selling
              </p>

              <h2 className="mt-1 text-lg font-black text-[var(--text)]">
                Price & stock alert
              </h2>
            </header>

            <div className="space-y-5 px-5 py-4">
              <div>
                <label
                  htmlFor="sellingPrice"
                  className={labelClass}
                >
                  Selling price
                </label>

                <div className="mt-2 flex h-12 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] transition focus-within:border-[var(--primary)]">
                  <span className="flex items-center border-r border-[var(--border)] px-3 text-xs font-black text-[var(--muted)]">
                    RWF
                  </span>

                  <input
                    id="sellingPrice"
                    name="sellingPrice"
                    inputMode="decimal"
                    defaultValue={
                      Number(
                        product?.sellingPrice || '0',
                      ) > 0
                        ? Number(
                            product?.sellingPrice,
                          )
                        : ''
                    }
                    placeholder="12000"
                    required
                    className="min-w-0 flex-1 bg-transparent px-4 text-sm font-black text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="minQuantity"
                  className={labelClass}
                >
                  Low-stock warning
                </label>

                <input
                  id="minQuantity"
                  name="minQuantity"
                  type="number"
                  min="0"
                  defaultValue={
                    product?.minQuantity ?? 5
                  }
                  required
                  className={`${fieldClass} mt-2`}
                />

                <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
                  Warn when available stock reaches this number.
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--border)] px-5 py-3.5">
              <p className="text-xs font-black text-[var(--text)]">
                {product
                  ? 'Stock is managed from Stock'
                  : 'Stock starts at 0'}
              </p>

              <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">
                {product
                  ? 'Receive or fix stock from the Stock page.'
                  : 'Quantity, buying price and supplier are added when stock is received.'}
              </p>
            </div>
          </section>
        </aside>
      </div>

      {product ? (
        <section className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 sm:px-6">
          <label
            htmlFor="reason"
            className={labelClass}
          >
            {isEmployeeEdit
              ? 'What needs changing?'
              : 'Why are you changing this?'}
          </label>

          <textarea
            id="reason"
            name="reason"
            rows={3}
            required
            disabled={hasPendingRequest}
            placeholder={
              isEmployeeEdit
                ? 'Example: The selling price should be RWF 13,000'
                : 'Example: Selling price changed'
            }
            className="mt-2 min-h-24 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-bold leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </section>
      ) : null}

      {state.error ? (
        <div className="mt-4 rounded-lg border border-[var(--danger)] px-4 py-3 text-sm font-bold text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
        <Link
          href={backHref}
          prefetch
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border)] px-5 text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)]"
        >
          Back
        </Link>

        <button
          type="submit"
          disabled={
            pending ||
            Boolean(
              product &&
                hasPendingRequest,
            )
          }
          className="h-11 rounded-lg bg-[var(--primary)] px-6 text-sm font-black text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? isEmployeeEdit
              ? 'Sending...'
              : 'Saving...'
            : product
              ? hasPendingRequest
                ? userRole === 'OWNER'
                  ? 'Review request'
                  : 'Request sent'
                : isEmployeeEdit
                  ? 'Send request'
                  : 'Save changes'
              : 'Save product'}
        </button>
      </div>
    </form>
  );
}
