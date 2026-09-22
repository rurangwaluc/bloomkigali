'use client';

import {
  useMemo,
  useState,
} from 'react';
import {
  useFormStatus,
} from 'react-dom';

import {
  submitLaterPaymentFixAction,
} from '@/lib/sales/payment-fixes';


type PaymentMethod =
  | 'CASH'
  | 'MOBILE_MONEY'
  | 'BANK'
  | 'CARD';


type Props = {
  saleId: string;
  paymentId: string;

  role:
    | 'OWNER'
    | 'EMPLOYEE';

  saleTotal: number;
  otherApplied: number;
  hasCustomer: boolean;
  pendingRequest: boolean;

  error:
    | string
    | null;

  initial: {
    paymentMethod:
      PaymentMethod;

    receivedAmount:
      number;
  };
};


const methods:
  Array<{
    value:
      PaymentMethod;
    label:
      string;
  }> = [
    {
      value: 'CASH',
      label: 'Cash',
    },
    {
      value: 'MOBILE_MONEY',
      label: 'Mobile money',
    },
    {
      value: 'BANK',
      label: 'Bank',
    },
    {
      value: 'CARD',
      label: 'Card',
    },
  ];


function roundMoney(
  value: number,
) {
  return Math.round(
    value * 100,
  ) / 100;
}


function money(
  value: number,
) {
  return `RWF ${Number(
    value || 0,
  ).toLocaleString(
    'en-US',
    {
      maximumFractionDigits:
        2,
    },
  )}`;
}


function SubmitButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        disabled ||
        pending
      }
      className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? 'Saving...'
        : label}
    </button>
  );
}


export default function LaterPaymentFixForm({
  saleId,
  paymentId,
  role,
  saleTotal,
  otherApplied,
  hasCustomer,
  pendingRequest,
  error,
  initial,
}: Props) {
  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<
      PaymentMethod
    >(
      initial
        .paymentMethod,
    );

  const [
    receivedAmount,
    setReceivedAmount,
  ] =
    useState(
      String(
        initial
          .receivedAmount,
      ),
    );

  const [
    reason,
    setReason,
  ] =
    useState('');

  const received =
    Number(
      receivedAmount ||
      0,
    );

  const safeReceived =
    Number.isFinite(
      received,
    )
      ? received
      : 0;

  const totalPaid =
    roundMoney(
      otherApplied +
      Math.max(
        safeReceived,
        0,
      ),
    );

  const balance =
    roundMoney(
      saleTotal -
      totalPaid,
    );

  const changed =
    paymentMethod !==
      initial
        .paymentMethod ||
    roundMoney(
      safeReceived,
    ) !==
      roundMoney(
        initial
          .receivedAmount,
      );

  const problems =
    useMemo(
      () => {
        const list:
          string[] = [];

        if (
          !Number.isFinite(
            received,
          ) ||
          safeReceived < 0
        ) {
          list.push(
            'Enter a valid amount received.',
          );
        }

        if (
          totalPaid >
          saleTotal
        ) {
          list.push(
            'This would make the sale overpaid.',
          );
        }

        if (
          balance > 0 &&
          !hasCustomer
        ) {
          list.push(
            'This would leave unpaid money. Add the customer to the sale first.',
          );
        }

        return list;
      },
      [
        balance,
        hasCustomer,
        received,
        safeReceived,
        saleTotal,
        totalPaid,
      ],
    );

  const canSave =
    changed &&
    reason
      .trim()
      .length > 0 &&
    problems.length ===
      0 &&
    !pendingRequest;

  return (
    <form
      action={
        submitLaterPaymentFixAction
      }
      className="space-y-4"
    >
      <input
        type="hidden"
        name="saleId"
        value={
          saleId
        }
      />

      <input
        type="hidden"
        name="paymentId"
        value={
          paymentId
        }
      />

      <input
        type="hidden"
        name="paymentMethod"
        value={
          paymentMethod
        }
      />

      {error ? (
        <div className="rounded-lg border border-[var(--danger)] px-4 py-3 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {pendingRequest ? (
        <div className="rounded-lg border border-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--text)]">
          This payment fix is already waiting for the owner.
        </div>
      ) : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
          Payment
        </p>

        <h3 className="mt-1 text-xl font-black text-[var(--text)]">
          What should this payment have been?
        </h3>

        <div className="mt-5">
          <p className="text-xs font-black text-[var(--muted)]">
            Payment method
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {methods.map(
              (method) => (
                <button
                  key={
                    method.value
                  }
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      method.value,
                    )
                  }
                  className={
                    paymentMethod ===
                    method.value
                      ? 'h-10 rounded-lg border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3 text-sm font-black text-[var(--text)]'
                      : 'h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)]'
                  }
                >
                  {
                    method.label
                  }
                </button>
              ),
            )}
          </div>
        </div>

        <label className="mt-5 block max-w-sm">
          <span className="text-xs font-black text-[var(--muted)]">
            Amount received
          </span>

          <input
            name="receivedAmount"
            inputMode="decimal"
            value={
              receivedAmount
            }
            onChange={(
              event,
            ) =>
              setReceivedAmount(
                event.target
                  .value,
              )
            }
            className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-black text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              Total paid
            </p>

            <p className="mt-1 text-sm font-black text-[var(--text)]">
              {money(
                totalPaid,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              Still unpaid
            </p>

            <p className="mt-1 text-sm font-black text-[var(--text)]">
              {money(
                Math.max(
                  balance,
                  0,
                ),
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <label className="block">
          <span className="text-sm font-black text-[var(--text)]">
            What was entered wrong?
          </span>

          <textarea
            name="reason"
            value={
              reason
            }
            onChange={(
              event,
            ) =>
              setReason(
                event.target
                  .value,
              )
            }
            rows={3}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          />
        </label>

        {problems.length > 0 ? (
          <p className="mt-3 text-sm font-bold text-[var(--danger)]">
            {
              problems[0]
            }
          </p>
        ) : null}

        <p className="mt-3 text-xs font-semibold text-[var(--muted)]">
          This changes this payment only. Items and stock are not changed.
        </p>

        <div className="mt-4 flex justify-end">
          <SubmitButton
            disabled={
              !canSave
            }
            label={
              role ===
              'OWNER'
                ? 'Save fix'
                : 'Send request'
            }
          />
        </div>
      </section>
    </form>
  );
}
