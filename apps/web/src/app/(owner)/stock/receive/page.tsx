import {
  and,
  asc,
  eq,
} from 'drizzle-orm';
import { db } from '@bloom-kigali/db/client';
import { products } from '@bloom-kigali/db/schema';
import { ReceiveStockForm } from './receive-stock-form';

type ReceiveStockPageProps = {
  searchParams?: Promise<{
    product?: string;
    error?: string;
  }>;
};

export default async function ReceiveStockPage({
  searchParams,
}: ReceiveStockPageProps) {
  const params = await searchParams;

  const requestedProductId =
    params?.product || '';

  const error = params?.error || '';

  const stockProducts = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      customerType:
        products.customerType,
      ageStage: products.ageStage,
      size: products.size,
      color: products.color,
      quantity: products.quantity,
      unit: products.unit,
      supplierName:
        products.supplierName,
    })
    .from(products)
    .where(
      and(
        eq(products.status, 'ACTIVE'),
        eq(
          products.itemType,
          'PRODUCT',
        ),
      ),
    )
    .orderBy(asc(products.name));

  const initialProductId =
    stockProducts.some(
      (product) =>
        product.id ===
        requestedProductId,
    )
      ? requestedProductId
      : '';

  return (
    <section className="mx-auto max-w-5xl">
      <ReceiveStockForm
        products={stockProducts}
        initialProductId={
          initialProductId
        }
        error={error}
      />
    </section>
  );
}
