import { z } from 'zod';

const moneySchema = z
  .string()
  .trim()
  .regex(/^[0-9]+(\.[0-9]{1,2})?$/, 'Enter a valid amount.');

export const moneyTransferSchema = z.object({
  fromPaymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK', 'CARD']),
  toPaymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK', 'CARD']),
  amount: moneySchema,
  notes: z.string().trim().max(1000).optional(),
});

export const addMoneySchema = z.object({
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK', 'CARD']),
  amount: moneySchema,
  notes: z.string().trim().max(1000).optional(),
});

export type MoneyTransferInput = z.infer<typeof moneyTransferSchema>;
export type AddMoneyInput = z.infer<typeof addMoneySchema>;
