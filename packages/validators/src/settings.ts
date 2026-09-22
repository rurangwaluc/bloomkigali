import { z } from 'zod';

export const businessSettingsSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is required.').max(160),
  ownerName: z.string().trim().min(2, 'Owner name is required.').max(120),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  currency: z.literal('RWF'),
  lowStockAlertQuantity: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]*$/, 'Low stock alert must be a positive number.'),
  expiryAlertDays: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]*$/, 'Expiry alert days must be a positive number.'),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;
