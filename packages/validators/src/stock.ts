import { z } from 'zod';

const moneySchema = z
  .string()
  .trim()
  .regex(/^[0-9]+(\.[0-9]{1,2})?$/, 'Enter a valid amount.')
  .refine(
    (value) => Number(value) > 0,
    'Buying price must be more than 0.',
  );

export const stockArrivalSchema = z.object({
  productId: z.string().uuid('Choose a product.'),
  quantityReceived: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  buyingPrice: moneySchema,
  supplierName: z.string().trim().max(160).optional(),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type StockArrivalInput = z.infer<typeof stockArrivalSchema>;
