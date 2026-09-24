'use client';

import Link from 'next/link';
import {
  Bell,
  LogOut,
  Search,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/auth/actions';
import {
  OwnerRequestNotifier,
  type RequestNotification,
} from './owner-request-notifier';
import { ThemeToggle } from './theme-toggle';

function getPageName(pathname: string) {
  if (pathname === '/requests') {
    return {
      eyebrow: 'Owner',
      title: 'Requests',
    };
  }

  if (pathname === '/settings') {
    return {
      eyebrow: 'Settings',
      title: 'Settings',
    };
  }

  if (pathname === '/products/new') {
    return {
      eyebrow: 'Products',
      title: 'Add product',
    };
  }

  if (
    pathname.startsWith('/products/') &&
    pathname.endsWith('/edit')
  ) {
    return {
      eyebrow: 'Products',
      title: 'Product details',
    };
  }

  if (pathname === '/products') {
    return {
      eyebrow: 'Products',
      title: 'Products',
    };
  }

  if (pathname === '/sales/new') {
    return {
      eyebrow: 'Sales',
      title: 'New sale',
    };
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
    return {
      eyebrow: 'Sales',
      title: 'Sales',
    };
  }

  if (pathname === '/stock/receive') {
    return {
      eyebrow: 'Stock',
      title: 'Receive stock',
    };
  }

  if (
    pathname.startsWith(
      '/stock/received/',
    )
  ) {
    return {
      eyebrow: 'Stock',
      title: 'Stock received',
    };
  }

  if (pathname === '/stock') {
    return {
      eyebrow: 'Stock',
      title: 'Stock',
    };
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
    return {
      eyebrow: 'Unpaid sales',
      title: 'Unpaid sales',
    };
  }

  if (
    pathname.startsWith(
      '/customers/',
    ) &&
    pathname !== '/customers'
  ) {
    return {
      eyebrow: 'Customers',
      title: 'Customer details',
    };
  }

  if (pathname === '/customers') {
    return {
      eyebrow: 'Customers',
      title: 'Customers',
    };
  }

  if (pathname === '/money') {
    return {
      eyebrow: 'Money',
      title: 'Money',
    };
  }

  if (
    pathname.startsWith(
      '/expenses/',
    ) &&
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
    return {
      eyebrow: 'Reports',
      title: 'Reports',
    };
  }

  return {
    eyebrow: 'Bloom Kigali',
    title: 'Bloom Kigali',
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
    userName.trim().split(/\s+/)[0] ||
    userName;

  const initial =
    firstName.charAt(0).toUpperCase() ||
    'B';

  const roleName =
    userRole === 'OWNER'
      ? 'Owner'
      : 'Staff';

  const onDashboard =
    pathname === '/dashboard';

  return (
    <header>
      <div className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] pb-3">
        <form
          action="/products"
          method="get"
          className="hidden h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 lg:flex lg:max-w-xl"
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />

          <input
            type="search"
            name="q"
            placeholder="Search products..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--text)] outline-none placeholder:font-medium placeholder:text-[var(--muted)]"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {userRole === 'OWNER' ? (
            <Link
              href="/requests"
              aria-label={
                pendingRequestCount > 0
                  ? `${pendingRequestCount} requests waiting`
                  : 'Requests'
              }
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-[var(--text)] transition hover:bg-[var(--surface)]"
            >
              <Bell className="h-[18px] w-[18px]" />

              {pendingRequestCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--primary)]" />
              ) : null}
            </Link>
          ) : null}

          <div
            className="hidden items-center gap-3 border-l border-[var(--border)] pl-3 sm:flex"
            aria-label={`${dashboardGreeting}, ${firstName}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-black text-[var(--text)]">
              {initial}
            </div>

            <div className="min-w-0">
              <p className="max-w-36 truncate text-sm font-black text-[var(--text)]">
                {firstName}
              </p>

              <p className="text-[11px] font-semibold text-[var(--muted)]">
                {roleName}
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
      </div>

      {!onDashboard ? (
        <div className="pb-1 pt-5 pl-12 lg:pl-0">
          {page.title !== 'Settings' ? (
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--primary)]">
              {page.eyebrow}
            </p>
          ) : null}

          <h1
            className={
              page.title === 'Settings'
                ? 'text-2xl font-black tracking-tight text-[var(--text)]'
                : 'mt-1 text-2xl font-black tracking-tight text-[var(--text)]'
            }
          >
            {page.title}
          </h1>
        </div>
      ) : null}

      {userRole === 'OWNER' ? (
        <OwnerRequestNotifier
          initialCount={
            pendingRequestCount
          }
          initialLatest={latestRequest}
        />
      ) : null}
    </header>
  );
}
