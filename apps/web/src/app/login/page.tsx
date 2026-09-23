import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PublicThemeToggle } from '../public-theme-toggle';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="auth-shell min-h-screen px-4 py-5 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <Link
            href="/"
            className="min-w-0 text-[var(--text)] no-underline"
          >
            <p className="shop-display text-[28px] font-bold leading-none tracking-[-0.04em] text-[var(--primary)]">
              Bloom Kigali
            </p>

            <p className="mt-1.5 text-[11px] font-semibold tracking-[0.04em] text-[var(--muted)]">
              Owner and staff access
            </p>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="hidden h-10 items-center justify-center gap-2 rounded-[4px] border border-[var(--border-strong)] px-4 text-xs font-bold text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>

            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--border-strong)] text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] sm:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <PublicThemeToggle />
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="w-full max-w-[410px]">
            <div className="mb-7 text-center">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                Private access
              </p>

              <h1 className="shop-display text-[52px] font-semibold leading-none tracking-[-0.045em] text-[var(--text)]">
                Sign in
              </h1>

              <p className="mx-auto mt-4 max-w-sm text-[13px] leading-6 text-[var(--muted)]">
                Enter your details to continue to Bloom Kigali.
              </p>
            </div>

            <div className="border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
              <LoginForm />
            </div>

            <div className="mt-4 grid grid-cols-3 border border-[var(--border)] text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
              <span className="px-2 py-3">
                Sales
              </span>

              <span className="border-x border-[var(--border)] px-2 py-3">
                Stock
              </span>

              <span className="px-2 py-3">
                Customers
              </span>
            </div>

            <p className="mt-4 text-center text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--muted)]">
              Authorized owner and staff only
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
