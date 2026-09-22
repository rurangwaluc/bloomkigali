'use client';

import { useActionState } from 'react';
import { updateBusinessSettingsAction } from '@/lib/settings/actions';

type SettingsFormProps = {
  settings: {
    businessName: string;
    ownerName: string;
    phone: string;
    address: string;
  };
};

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]"
    >
      {children}
    </label>
  );
}

const inputClass =
  'h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#1B1B1B] dark:text-[#F5F5F5]';

export function SettingsForm({
  settings,
}: SettingsFormProps) {
  const [
    state,
    action,
    pending,
  ] = useActionState(
    updateBusinessSettingsAction,
    {},
  );

  return (
    <form
      action={action}
      className="max-w-4xl space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="businessName">
            Business name
          </FieldLabel>

          <input
            id="businessName"
            name="businessName"
            defaultValue={
              settings.businessName
            }
            required
            className={
              inputClass
            }
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="ownerName">
            Owner name
          </FieldLabel>

          <input
            id="ownerName"
            name="ownerName"
            defaultValue={
              settings.ownerName
            }
            required
            className={
              inputClass
            }
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="phone">
            Phone number
          </FieldLabel>

          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={
              settings.phone
            }
            placeholder="+250..."
            className={
              inputClass
            }
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <FieldLabel htmlFor="address">
            Business address
          </FieldLabel>

          <textarea
            id="address"
            name="address"
            defaultValue={
              settings.address
            }
            rows={3}
            placeholder="Shop location or business address"
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3.5 py-3 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#1B1B1B] dark:text-[#F5F5F5]"
          />
        </div>
      </div>

      {state.error ? (
        <div className="rounded-lg border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-bold text-[#8A5A00] dark:text-[#FFD45A]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-lg border border-[#5F8A63]/40 bg-[#5F8A63]/10 px-4 py-3 text-sm font-bold text-[#5F8A63] dark:text-[#79C27D]">
          {state.success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            pending
          }
          className="h-11 w-full rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {pending
            ? 'Saving...'
            : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
