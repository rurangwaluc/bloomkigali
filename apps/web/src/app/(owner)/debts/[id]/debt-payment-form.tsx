'use client';

import {
  useActionState,
  useEffect,
  useRef,
} from 'react';

import { recordDebtPaymentAction } from '@/lib/debts/actions';

type DebtPaymentFormProps = {
  saleId: string;
  balanceAmount: string;
  hasOpenDrawer: boolean;
};

export function DebtPaymentForm({
  saleId,
  balanceAmount,
  hasOpenDrawer,
}: DebtPaymentFormProps) {
  const formRef =
    useRef<HTMLFormElement>(
      null,
    );

  const [
    state,
    action,
    pending,
  ] = useActionState(
    recordDebtPaymentAction,
    {},
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="saleId"
        value={saleId}
      />

      <div>
        <label
          htmlFor="amount"
          className="text-sm font-black text-[var(--text)]"
        >
          Amount paid
        </label>

        <input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          max={balanceAmount}
          required
          placeholder="Enter amount"
          className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
        />
      </div>

      <div>
        <label
          htmlFor="paymentMethod"
          className="text-sm font-black text-[var(--text)]"
        >
          Paid by
        </label>

        <select
          id="paymentMethod"
          name="paymentMethod"
          defaultValue=""
          required
          className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-black text-[var(--text)] outline-none focus:border-[var(--primary)]"
        >
          <option
            value=""
            disabled
          >
            Choose payment method
          </option>

          <option
            value="CASH"
            disabled={
              !hasOpenDrawer
            }
          >
            {hasOpenDrawer
              ? 'Cash'
              : 'Cash — open drawer first'}
          </option>

          <option value="MOBILE_MONEY">
            Mobile money
          </option>

          <option value="BANK">
            Bank
          </option>

          <option value="CARD">
            Card
          </option>
        </select>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="text-sm font-black text-[var(--text)]"
        >
          Note{' '}
          <span className="font-semibold text-[var(--muted)]">
            (optional)
          </span>
        </label>

        <input
          id="notes"
          name="notes"
          placeholder="Add a note"
          className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
        />
      </div>

      {state.error ? (
        <div className="rounded-lg border border-[#E85D5D]/30 px-3 py-2 text-sm font-bold text-[#E85D5D]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-lg border border-[#5F8A63]/30 px-3 py-2 text-sm font-bold text-[#5F8A63] dark:text-[#79C27D]">
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? 'Saving...'
          : 'Save payment'}
      </button>
    </form>
  );
}
