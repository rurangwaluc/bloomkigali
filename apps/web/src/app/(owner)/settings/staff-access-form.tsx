'use client';

import { useActionState } from 'react';
import {
  resetStaffPasswordAction,
  updateStaffProfileAction,
  updateStaffStatusAction,
} from '@/lib/settings/password-actions';

type StaffUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status:
    | 'ACTIVE'
    | 'DISABLED';
};

type StaffAccessFormProps = {
  staffUsers: StaffUser[];
};

const inputClass =
  'h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-[#222222] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] dark:border-[#343434] dark:bg-[#1B1B1B] dark:text-[#F5F5F5]';

export function StaffAccessForm({
  staffUsers,
}: StaffAccessFormProps) {
  const [
    state,
    resetPasswordAction,
    pending,
  ] = useActionState(
    resetStaffPasswordAction,
    {},
  );

  return (
    <section className="w-full">
      <div className="max-w-5xl">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
          Staff
        </p>

        <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
          Staff access
        </h2>

        <p className="mt-1 text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
          Update staff details, reset passwords or stop sign-in access.
        </p>

        {staffUsers.length ===
        0 ? (
          <p className="mt-5 text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
            No staff account found.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-[#343434] dark:border-[#343434]">
            {staffUsers.map(
              (staff) => (
                <article
                  key={
                    staff.id
                  }
                  className="py-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-black text-[#222222] dark:text-[#F5F5F5]">
                        {
                          staff.name
                        }
                      </h3>

                      <p className="mt-1 break-words text-sm font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                        {
                          staff.email
                        }
                      </p>
                    </div>

                    <p
                      className={
                        staff.status ===
                        'ACTIVE'
                          ? 'shrink-0 text-xs font-black uppercase tracking-[0.14em] text-[#5F8A63] dark:text-[#79C27D]'
                          : 'shrink-0 text-xs font-black uppercase tracking-[0.14em] text-[#E85D5D]'
                      }
                    >
                      {staff.status ===
                      'ACTIVE'
                        ? 'Can sign in'
                        : 'Access stopped'}
                    </p>
                  </div>

                  <form
                    action={
                      updateStaffProfileAction
                    }
                    className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
                  >
                    <input
                      type="hidden"
                      name="staffUserId"
                      value={
                        staff.id
                      }
                    />

                    <div className="space-y-2">
                      <label
                        htmlFor={`staff-name-${staff.id}`}
                        className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]"
                      >
                        Name
                      </label>

                      <input
                        id={`staff-name-${staff.id}`}
                        name="name"
                        defaultValue={
                          staff.name
                        }
                        required
                        className={
                          inputClass
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`staff-phone-${staff.id}`}
                        className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]"
                      >
                        Phone
                      </label>

                      <input
                        id={`staff-phone-${staff.id}`}
                        name="phone"
                        type="tel"
                        defaultValue={
                          staff.phone ||
                          ''
                        }
                        placeholder="+250..."
                        className={
                          inputClass
                        }
                      />
                    </div>

                    <button
                      type="submit"
                      className="h-11 rounded-lg border border-neutral-200 bg-white px-5 text-sm font-black text-[#222222] transition hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-[#343434] dark:bg-[#1B1B1B] dark:text-[#F5F5F5]"
                    >
                      Save
                    </button>
                  </form>

                  <div className="mt-4 flex flex-col gap-4 border-t border-neutral-100 pt-4 dark:border-[#343434] lg:flex-row lg:items-start lg:justify-between">
                    <details className="w-full lg:max-w-2xl">
                      <summary className="cursor-pointer text-sm font-black text-[var(--primary)]">
                        Reset password
                      </summary>

                      <form
                        action={
                          resetPasswordAction
                        }
                        className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
                      >
                        <input
                          type="hidden"
                          name="staffUserId"
                          value={
                            staff.id
                          }
                        />

                        <div className="space-y-2">
                          <label
                            htmlFor={`staff-new-password-${staff.id}`}
                            className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]"
                          >
                            New password
                          </label>

                          <input
                            id={`staff-new-password-${staff.id}`}
                            name="newPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            className={
                              inputClass
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor={`staff-confirm-password-${staff.id}`}
                            className="text-sm font-black text-[#222222] dark:text-[#F5F5F5]"
                          >
                            Confirm password
                          </label>

                          <input
                            id={`staff-confirm-password-${staff.id}`}
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            className={
                              inputClass
                            }
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={
                            pending
                          }
                          className="h-11 rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {pending
                            ? 'Resetting...'
                            : 'Reset password'}
                        </button>
                      </form>
                    </details>

                    <form
                      action={
                        updateStaffStatusAction
                      }
                      className="shrink-0"
                    >
                      <input
                        type="hidden"
                        name="staffUserId"
                        value={
                          staff.id
                        }
                      />

                      <input
                        type="hidden"
                        name="status"
                        value={
                          staff.status ===
                          'ACTIVE'
                            ? 'DISABLED'
                            : 'ACTIVE'
                        }
                      />

                      <button
                        type="submit"
                        className={
                          staff.status ===
                          'ACTIVE'
                            ? 'h-10 rounded-lg border border-[#E85D5D]/40 px-4 text-sm font-black text-[#E85D5D] transition hover:bg-[#E85D5D]/10'
                            : 'h-10 rounded-lg border border-[#5F8A63]/40 px-4 text-sm font-black text-[#5F8A63] transition hover:bg-[#5F8A63]/10 dark:text-[#79C27D]'
                        }
                      >
                        {staff.status ===
                        'ACTIVE'
                          ? 'Stop access'
                          : 'Allow access'}
                      </button>
                    </form>
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        {state.error ? (
          <div className="mt-4 rounded-lg border border-[#F2C94C]/50 bg-[#F2C94C]/10 px-4 py-3 text-sm font-bold text-[#8A5A00] dark:text-[#FFD45A]">
            {state.error}
          </div>
        ) : null}

        {state.success ? (
          <div className="mt-4 rounded-lg border border-[#5F8A63]/40 bg-[#5F8A63]/10 px-4 py-3 text-sm font-bold text-[#5F8A63] dark:text-[#79C27D]">
            {
              state.success
            }
          </div>
        ) : null}
      </div>
    </section>
  );
}
