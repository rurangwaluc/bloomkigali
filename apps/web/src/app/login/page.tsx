import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
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
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-5">
          <Link href="/" className="flex min-w-0 items-center gap-3 text-[var(--text)] no-underline">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-black text-white shadow-sm">
              MP
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--text)]">
                Mama&apos;s Pride Boutique
              </p>
              <p className="text-xs font-bold text-[var(--muted)]">
                Owner and employee access
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="hidden h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-black text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>

            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] sm:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <ThemeToggle />
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--primary)]">
                Shop access
              </p>
              <h1 className="shop-display text-5xl font-bold leading-none text-[var(--text)]">
                Sign in
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
                Open the shop dashboard to manage sales, stock, customers, and daily work.
              </p>
            </div>

            <div className="business-card rounded-3xl p-5 sm:p-6">
              <LoginForm />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-black text-[var(--muted)]">
              <span className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2 py-3">
                Sales
              </span>
              <span className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2 py-3">
                Stock
              </span>
              <span className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2 py-3">
                Customers
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
