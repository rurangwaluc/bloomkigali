'use client';

import {
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { receiveStockAction } from '@/lib/stock/actions';

type ProductOption = {
  id: string;
  name: string;
  category: string;
  customerType: string;
  ageStage: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unit: string;
  supplierName: string | null;
};

type ReceiveStockFormProps = {
  products: ProductOption[];
  initialProductId?: string;
  error?: string;
};

const inputClass =
  'h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-bold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)]';

function productDetails(
  product: ProductOption,
) {
  return [
    product.customerType,
    product.ageStage,
    product.size,
    product.color,
  ]
    .filter(Boolean)
    .join(' / ');
}

function quantityLabel(
  quantity: number,
  unit: string,
) {
  if (quantity === 0) {
    return '0';
  }

  if (quantity === 1) {
    return `1 ${unit}`;
  }

  return `${quantity} ${unit}s`;
}

export function ReceiveStockForm({
  products,
  initialProductId = '',
  error,
}: ReceiveStockFormProps) {
  const initialProduct =
    products.find(
      (product) =>
        product.id ===
        initialProductId,
    );

  const [
    productSearch,
    setProductSearch,
  ] = useState(
    initialProduct?.name || '',
  );

  const [
    selectedProductId,
    setSelectedProductId,
  ] = useState(initialProductId);

  const [
    isProductSearchOpen,
    setIsProductSearchOpen,
  ] = useState(false);

  const [
    quantityReceived,
    setQuantityReceived,
  ] = useState('');

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          product.id ===
          selectedProductId,
      ),
    [
      products,
      selectedProductId,
    ],
  );

  const filteredProducts =
    useMemo(() => {
      const search =
        productSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return products.slice(0, 8);
      }

      return products
        .filter((product) => {
          const target = [
            product.name,
            product.category,
            product.customerType,
            product.ageStage || '',
            product.size || '',
            product.color || '',
          ]
            .join(' ')
            .toLowerCase();

          return target.includes(search);
        })
        .slice(0, 8);
    }, [
      productSearch,
      products,
    ]);

  const receivedQuantity =
    Number(quantityReceived);

  const validReceivedQuantity =
    Number.isInteger(
      receivedQuantity,
    ) &&
    receivedQuantity > 0
      ? receivedQuantity
      : 0;

  const projectedQuantity =
    selectedProduct
      ? selectedProduct.quantity +
        validReceivedQuantity
      : 0;

  return (
    <form
      action={receiveStockAction}
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
    >
      <input
        type="hidden"
        name="productId"
        value={selectedProductId}
      />

      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <h3 className="text-base font-black text-[var(--text)]">
          Stock details
        </h3>

        <p className="mt-1 text-xs font-bold text-[var(--muted)]">
          Choose the product and record what arrived.
        </p>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div>
          <label
            htmlFor="productSearch"
            className="text-sm font-black text-[var(--text)]"
          >
            Product
          </label>

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

            <input
              id="productSearch"
              value={productSearch}
              onChange={(event) => {
                setProductSearch(
                  event.target.value,
                );
                setSelectedProductId('');
                setIsProductSearchOpen(
                  true,
                );
              }}
              onFocus={() =>
                setIsProductSearchOpen(
                  true,
                )
              }
              placeholder="Search product, category, age, size, or color"
              autoComplete="off"
              className={`${inputClass} pl-10`}
            />

            {isProductSearchOpen ? (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-lg">
                {filteredProducts.length ===
                0 ? (
                  <p className="px-3 py-4 text-sm font-bold text-[var(--muted)]">
                    No product found.
                  </p>
                ) : (
                  filteredProducts.map(
                    (product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(
                            product.id,
                          );
                          setProductSearch(
                            product.name,
                          );
                          setIsProductSearchOpen(
                            false,
                          );
                        }}
                        className="w-full rounded-md px-3 py-3 text-left transition hover:bg-[var(--surface)]"
                      >
                        <span className="block text-sm font-black text-[var(--text)]">
                          {product.name}
                        </span>

                        <span className="mt-1 block text-xs font-bold leading-5 text-[var(--muted)]">
                          {product.category}
                          {productDetails(
                            product,
                          )
                            ? ` / ${productDetails(
                                product,
                              )}`
                            : ''}
                        </span>

                        <span className="mt-1 block text-xs font-bold text-[var(--muted)]">
                          Current stock:{' '}
                          {quantityLabel(
                            product.quantity,
                            product.unit,
                          )}
                        </span>
                      </button>
                    ),
                  )
                )}
              </div>
            ) : null}
          </div>

          {!selectedProduct ? (
            <p className="mt-2 text-xs font-bold text-[var(--muted)]">
              Search and select the
              product that arrived.
            </p>
          ) : null}
        </div>

        {selectedProduct ? (
          <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <div className="px-4 py-3">
              <p className="text-sm font-black text-[var(--text)]">
                {selectedProduct.name}
              </p>

              <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                {selectedProduct.category}
                {productDetails(
                  selectedProduct,
                )
                  ? ` / ${productDetails(
                      selectedProduct,
                    )}`
                  : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 border-t border-[var(--border)]">
              <div className="border-r border-[var(--border)] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Current stock
                </p>

                <p className="mt-1 text-sm font-black text-[var(--text)]">
                  {quantityLabel(
                    selectedProduct.quantity,
                    selectedProduct.unit,
                  )}
                </p>
              </div>

              <div className="px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  After receive
                </p>

                <p className="mt-1 text-sm font-black text-[var(--text)]">
                  {validReceivedQuantity >
                  0
                    ? quantityLabel(
                        projectedQuantity,
                        selectedProduct.unit,
                      )
                    : '—'}
                </p>
              </div>
            </div>
          </section>
        ) : null}

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
              min="1"
              step="1"
              required
              value={quantityReceived}
              onChange={(event) =>
                setQuantityReceived(
                  event.target.value,
                )
              }
              placeholder="Example: 20"
              className={`${inputClass} mt-2`}
            />
          </div>

          <div>
            <label
              htmlFor="buyingPrice"
              className="text-sm font-black text-[var(--text)]"
            >
              Buying price
              {selectedProduct
                ? ` per ${selectedProduct.unit}`
                : ' per unit'}
            </label>

            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--muted)]">
                RWF
              </span>

              <input
                id="buyingPrice"
                name="buyingPrice"
                inputMode="decimal"
                required
                placeholder="6500"
                className={`${inputClass} pl-14`}
              />
            </div>
          </div>

          <div className="sm:col-span-2">
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
              placeholder={
                selectedProduct
                  ?.supplierName ||
                'Supplier name'
              }
              className={`${inputClass} mt-2`}
            />
          </div>


        </div>

        {error ? (
          <div className="rounded-lg border border-[var(--danger)] px-4 py-3 text-sm font-bold text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-[1fr_auto]">
          <Link
            href="/stock"
            prefetch
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border)] px-5 text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)]"
          >
            Back
          </Link>

          <button
            type="submit"
            disabled={
              !selectedProductId ||
              validReceivedQuantity < 1
            }
            className="h-11 rounded-lg bg-[var(--primary)] px-6 text-sm font-black text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Receive stock
          </button>
        </div>
      </div>
    </form>
  );
}
