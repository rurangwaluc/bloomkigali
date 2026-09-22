'use client';

import { Archive } from 'lucide-react';
import { archiveCustomerAction } from '@/lib/customers/actions';

type ArchiveCustomerButtonProps = {
  customerId: string;
  customerName: string;
};

export function ArchiveCustomerButton({ customerId, customerName }: ArchiveCustomerButtonProps) {
  return (
    <form
      action={archiveCustomerAction}
      onSubmit={(event) => {
        const shouldArchive = window.confirm(`Archive "${customerName}"?`);

        if (!shouldArchive) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="customerId" value={customerId} />
      <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-300">
        <Archive className="h-3.5 w-3.5" />
        Archive
      </button>
    </form>
  );
}
