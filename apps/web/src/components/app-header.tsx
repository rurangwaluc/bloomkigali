'use client';

import { LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/auth/actions';
import { ModuleMenu } from './module-menu';
import {
  OwnerRequestNotifier,
  type RequestNotification,
} from './owner-request-notifier';
import { ThemeToggle } from './theme-toggle';

function getPageName(pathname: string) {
  if (pathname === '/dashboard') {
    return { eyebrow: 'Dashboard', title: 'Dashboard' };
  }

  if (pathname === '/requests') {
    return { eyebrow: 'Owner', title: 'Requests' };
  }

  if (pathname === '/settings') {
    return { eyebrow: 'Settings', title: 'Settings' };
  }

  if (pathname === '/products/new') {
    return { eyebrow: 'Products', title: 'Add product' };
  }

  if (
    pathname.startsWith('/products/') &&
    pathname.endsWith('/edit')
  ) {
    return { eyebrow: 'Products', title: 'Product details' };
  }

  if (pathname === '/products') {
    return { eyebrow: 'Products', title: 'Products' };
  }

  if (pathname === '/sales/new') {
    return { eyebrow: 'Sales', title: 'New sale' };
  }

  if (
    pathname.startsWith('/sales/') &&
    pathname !== '/sales/new'
  ) {
    return {
      eyebrow: 'Sales',
      title: 'Sale details',
    };
  }

  if (pathname === '/sales') {
    return { eyebrow: 'Sales', title: 'Sales' };
  }

  if (pathname === '/stock/receive') {
    return { eyebrow: 'Stock', title: 'Receive stock' };
  }

  if (pathname.startsWith('/stock/received/')) {
    return { eyebrow: 'Stock', title: 'Stock received' };
  }

  if (pathname === '/stock') {
    return { eyebrow: 'Stock', title: 'Stock' };
  }

  if (
    pathname.startsWith('/debts/') &&
    pathname !== '/debts'
  ) {
    return {
      eyebrow: 'Unpaid sales',
      title: 'Unpaid sale details',
    };
  }

  if (pathname === '/debts') {
    return { eyebrow: 'Unpaid sales', title: 'Unpaid sales' };
  }

  if (
    pathname.startsWith('/customers/') &&
    pathname !== '/customers'
  ) {
    return {
      eyebrow: 'Customers',
      title: 'Customer details',
    };
  }

  if (pathname === '/customers') {
    return { eyebrow: 'Customers', title: 'Customers' };
  }

  if (pathname === '/money') {
    return { eyebrow: 'Money', title: 'Money' };
  }

  if (
    pathname.startsWith('/expenses/') &&
    pathname !== '/expenses'
  ) {
    return {
      eyebrow: 'Expenses',
      title: 'Expense details',
    };
  }

  if (pathname === '/expenses') {
    return {
      eyebrow: 'Expenses',
      title: 'Expenses',
    };
  }

  if (pathname === '/reports') {
    return { eyebrow: 'Reports', title: 'Reports' };
  }

  return {
    eyebrow: 'Menu',
    title: "Bloom Kigali",
  };
}

type AppHeaderProps = {
  userName: string;
  userRole: 'OWNER' | 'EMPLOYEE';
  dashboardGreeting: string;
  pendingRequestCount: number;
  latestRequest:
    | RequestNotification
    | null;
};

export function AppHeader({
  userName,
  userRole,
  dashboardGreeting,
  pendingRequestCount,
  latestRequest,
}: AppHeaderProps) {
  const pathname = usePathname();
  const page = getPageName(pathname);

  const firstName =
    userName.trim().split(/\s+/)[0] || userName;

  const title =
    pathname === '/dashboard'
      ? `${dashboardGreeting}, ${firstName}`
      : page.title;

  const roleName =
    userRole === 'OWNER' ? 'Owner' : 'Employee';

  return (
    <header className="border-b border-[var(--border)] px-0 pb-4 pt-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-black text-white">
            MP
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              {page.eyebrow}
            </p>

            <h1 className="truncate text-xl font-black tracking-tight text-[var(--text)] sm:text-2xl">
              {title}
            </h1>

            <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">
              {roleName} access
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <ModuleMenu
            userRole={userRole}
            initialPendingRequestCount={
              pendingRequestCount
            }
          />

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <form action={logoutAction}>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-black text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--surface)] sm:px-4"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {userRole === 'OWNER' ? (
        <OwnerRequestNotifier
          initialCount={
            pendingRequestCount
          }
          initialLatest={
            latestRequest
          }
        />
      ) : null}
    </header>
  );
}
