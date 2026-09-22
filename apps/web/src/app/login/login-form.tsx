'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useActionState, useState } from 'react';
import { loginAction } from '@/lib/auth/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-black text-[var(--text)]">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="owner@bloomkigali.loc"
          className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-[15px] font-bold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-black text-[var(--text)]">
          Password
        </label>

        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 pr-12 text-[15px] font-bold text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-[var(--danger)] bg-[var(--primary-soft)] px-4 py-3 text-sm font-bold text-[var(--text)]">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-2xl border border-[var(--primary)] bg-[var(--primary)] px-5 text-sm font-black text-white shadow-sm transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-soft)] disabled:opacity-70"
      >
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
