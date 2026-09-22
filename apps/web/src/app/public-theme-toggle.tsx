'use client';

import { Moon, Sun } from 'lucide-react';

function toggleTheme() {
  const root = document.documentElement;
  const nextTheme = root.classList.contains('dark')
    ? 'light'
    : 'dark';

  root.classList.toggle(
    'dark',
    nextTheme === 'dark',
  );

  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;

  window.localStorage.setItem(
    'theme',
    nextTheme,
  );
}

export function PublicThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--primary)] transition hover:border-[var(--primary)] hover:bg-[var(--surface)]"
    >
      <Sun
        className="hidden h-4 w-4 dark:block"
        aria-hidden="true"
      />

      <Moon
        className="h-4 w-4 dark:hidden"
        aria-hidden="true"
      />
    </button>
  );
}
