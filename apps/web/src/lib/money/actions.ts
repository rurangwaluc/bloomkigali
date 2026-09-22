'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@bloom-kigali/db/client';
import { moneyAdditions, moneyTransfers } from '@bloom-kigali/db/schema';
import { addMoneySchema, moneyTransferSchema } from '@bloom-kigali/validators/money';
import { requireOwner } from '@/lib/auth/session';
import { getPaymentMethodBalance } from './balance';

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export async function addMoneyAction(formData: FormData) {
  await requireOwner();

  const parsed = addMoneySchema.safeParse({
    paymentMethod: formData.get('paymentMethod'),
    amount: formData.get('amount') || '0',
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the add money form.';
    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  const amount = Number(parsed.data.amount);

  if (amount <= 0) {
    redirect('/money?error=Amount must be above zero.');
  }

  await db.insert(moneyAdditions).values({
    paymentMethod: parsed.data.paymentMethod,
    amount: parsed.data.amount,
    notes: cleanOptional(parsed.data.notes),
  });

  revalidatePath('/money');
  revalidatePath('/dashboard');

  redirect('/money?added=1');
}

export async function moveMoneyAction(formData: FormData) {
  await requireOwner();

  const parsed = moneyTransferSchema.safeParse({
    fromPaymentMethod: formData.get('fromPaymentMethod'),
    toPaymentMethod: formData.get('toPaymentMethod'),
    amount: formData.get('amount') || '0',
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the money movement form.';
    redirect(`/money?error=${encodeURIComponent(message)}`);
  }

  if (parsed.data.fromPaymentMethod !== 'CASH') {
    redirect('/money?error=Money can only be moved from cash.');
  }

  if (!['MOBILE_MONEY', 'BANK'].includes(parsed.data.toPaymentMethod)) {
    redirect('/money?error=Move cash only to mobile money or bank.');
  }

  const amount = Number(parsed.data.amount);
  const availableMoney = await getPaymentMethodBalance('CASH');

  if (amount <= 0) {
    redirect('/money?error=Amount must be above zero.');
  }

  if (amount > availableMoney) {
    redirect(
      `/money?error=${encodeURIComponent(
        `Not enough cash. Cash has RWF ${availableMoney.toLocaleString('en-US')}.`,
      )}`,
    );
  }

  await db.insert(moneyTransfers).values({
    fromPaymentMethod: 'CASH',
    toPaymentMethod: parsed.data.toPaymentMethod,
    amount: parsed.data.amount,
    notes: cleanOptional(parsed.data.notes),
  });

  revalidatePath('/money');
  revalidatePath('/dashboard');

  redirect('/money?moved=1');
}
