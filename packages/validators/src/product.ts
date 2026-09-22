import { z } from 'zod';

const moneySchema = z
  .string()
  .trim()
  .regex(/^[0-9]+(\.[0-9]{1,2})?$/, 'Enter a valid amount.')
  .refine((value) => Number(value) > 0, 'Selling price must be more than zero.');

const wholeNumberSchema = z
  .string()
  .trim()
  .regex(/^[0-9]+$/, 'Enter a valid number.');

export const productFormSchema = z.object({
  itemType: z.literal('PRODUCT'),
  name: z
    .string()
    .trim()
    .min(2, 'Product name is required.')
    .max(180),

  category: z
    .string()
    .trim()
    .min(2, 'Category is required.')
    .max(120),

  customerType: z.enum(['Girl', 'Boy', 'Unisex']),

  ageStage: z
    .string()
    .trim()
    .max(60)
    .optional(),

  size: z
    .string()
    .trim()
    .max(60)
    .optional(),

  color: z
    .string()
    .trim()
    .max(80)
    .optional(),

  unit: z.enum(['piece', 'pair', 'set', 'pack']),

  sellingPrice: moneySchema,

  minQuantity: wholeNumberSchema,

  notes: z
    .string()
    .trim()
    .max(1000)
    .optional(),
});

export type ProductFormInput =
  z.infer<typeof productFormSchema>;
