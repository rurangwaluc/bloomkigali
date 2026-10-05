'use server';

import {
  revalidatePath,
} from 'next/cache';
import {
  redirect,
} from 'next/navigation';

import {
  db,
} from '@bloom-kigali/db/client';
import {
  moneyAdditions,
} from '@bloom-kigali/db/schema';
import {
  externalMoneyAdditionSchema,
} from '@bloom-kigali/validators/money';

import {
  requireOwner,
} from '@/lib/auth/session';

export async function addExternalMoneyAction(
  formData: FormData,
) {
  const user =
    await requireOwner();

  const parsed =
    externalMoneyAdditionSchema.safeParse(
      {
        paymentMethod:
          formData.get(
            'paymentMethod',
          ),

        amount:
          formData.get(
            'amount',
          ) || '0',

        reason:
          formData.get(
            'reason',
          ) || '',
      },
    );

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]
        ?.message ||
      'Check the external money form.';

    redirect(
      `/money?error=${encodeURIComponent(
        message,
      )}`,
    );
  }

  const amount =
    Number(
      parsed.data.amount,
    );

  if (amount <= 0) {
    redirect(
      '/money?error=Amount must be above zero.',
    );
  }

  await db
    .insert(
      moneyAdditions,
    )
    .values({
      addedByUserId:
        user.id,

      paymentMethod:
        parsed.data
          .paymentMethod,

      amount:
        parsed.data.amount,

      notes:
        parsed.data.reason,
    });

  revalidatePath(
    '/money',
  );

  revalidatePath(
    '/dashboard',
  );

  redirect(
    '/money?externalAdded=1',
  );
}
