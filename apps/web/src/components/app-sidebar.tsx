'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  House,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type UserRole = 'OWNER' | 'EMPLOYEE';

type AppSidebarProps = {
  userRole: UserRole;
};

const navigation = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: House,
    roles: ['OWNER', 'EMPLOYEE'],
  },
  {
    label: 'Sales',
    href: '/sales',
    icon: ShoppingCart,
    roles: ['OWNER', 'EMPLOYEE'],
  },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
    roles: ['OWNER', 'EMPLOYEE'],
  },
  {
    label: 'Stock',
    href: '/stock',
    icon: Boxes,
    roles: ['OWNER', 'EMPLOYEE'],
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: Users,
    roles: ['OWNER', 'EMPLOYEE'],
  },
  {
    label: 'Expenses',
    href: '/expenses',
    icon: ReceiptText,
    roles: ['OWNER', 'EMPLOYEE'],
  },
  {
    label: 'Money',
    href: '/money',
    icon: WalletCards,
    roles: ['OWNER', 'EMPLOYEE'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['OWNER'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['OWNER'],
  },
] as const;

function routeIsActive(
  pathname: string,
  href: string,
) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export function AppSidebar({
  userRole,
}: AppSidebarProps) {
  const pathname = usePathname();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [mobileOpen]);

  const visibleNavigation =
    navigation.filter((item) =>
      (
        item.roles as readonly UserRole[]
      ).includes(userRole),
    );

  const content = (
    <>
      <div className="border-b border-[var(--border)] px-5 pb-5 pt-6">
        <Link
          href="/dashboard"
          className="block no-underline"
        >
          <Image
            src="/brand/bloom-logo-horizontal.png"
            alt="Bloom Kigali"
            width={176}
            height={60}
            className="h-auto w-[176px] object-contain"
            priority
          />

          <p className="mt-2 text-[9px] font-semibold leading-4 text-[var(--muted)]">
            Beautiful flowers. Brighter moments.
          </p>
        </Link>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-2.5 py-5"
        aria-label="Main navigation"
      >
        <div className="space-y-1.5">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;

            const active =
              routeIsActive(
                pathname,
                item.href,
              );

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={
                  active
                    ? 'page'
                    : undefined
                }
                className={
                  active
                    ? 'flex min-h-12 items-center gap-3 rounded-[6px] bg-[var(--primary)] px-4 text-[13px] font-bold text-[#17150F] no-underline'
                    : 'flex min-h-12 items-center gap-3 rounded-[6px] px-4 text-[13px] font-semibold text-[var(--text)] no-underline transition hover:bg-[var(--surface)]'
                }
              >
                <Icon
                  className="h-[19px] w-[19px] shrink-0"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-5 pb-4">
        <div className="border-t border-[var(--border)] pt-4">
          <p className="shop-display text-[19px] font-semibold leading-[1.06] tracking-[-0.035em] text-[var(--text)]">
            Fresh flowers.
            <br />
            Brighter days.
          </p>

          <div className="mt-3 h-[2px] w-7 bg-[var(--primary)]" />

          <p className="mt-3 text-[9px] font-medium leading-4 text-[var(--muted)]">
            Bloom Kigali
            <br />
            Kigali, Rwanda
          </p>

        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setMobileOpen(true)
        }
        className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--text)] shadow-sm lg:hidden"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        <Menu
          className="h-[19px] w-[19px]"
          aria-hidden="true"
        />
      </button>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-[var(--border)] bg-[var(--card)] lg:flex">
        {content}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/45"
            onClick={() =>
              setMobileOpen(false)
            }
          />

          <aside className="relative flex h-full w-[min(290px,86vw)] flex-col border-r border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setMobileOpen(false)
              }
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
              aria-label="Close navigation"
            >
              <X
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              />
            </button>

            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
