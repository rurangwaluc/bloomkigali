'use client';

import {
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';

type InstallPromptEvent =
  Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
      outcome:
        | 'accepted'
        | 'dismissed';
    }>;
  };

function detectInstalledMode() {
  if (
    typeof window ===
    'undefined'
  ) {
    return false;
  }

  const navigatorWithStandalone =
    window.navigator as Navigator & {
      standalone?: boolean;
    };

  return (
    window.matchMedia(
      '(display-mode: standalone)',
    ).matches ||
    navigatorWithStandalone.standalone ===
      true
  );
}

export function InstallAppCard() {
  const [
    installPrompt,
    setInstallPrompt,
  ] =
    useState<InstallPromptEvent | null>(
      null,
    );

  const [
    isInstalled,
    setIsInstalled,
  ] = useState(
    detectInstalledMode,
  );

  const [
    updateReady,
    setUpdateReady,
  ] = useState(false);

  useEffect(() => {
    function handleInstallPrompt(
      event: Event,
    ) {
      event.preventDefault();

      setInstallPrompt(
        event as InstallPromptEvent,
      );
    }

    function handleInstalled() {
      setIsInstalled(
        true,
      );

      setInstallPrompt(
        null,
      );
    }

    function handleUpdate() {
      setUpdateReady(
        true,
      );
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleInstallPrompt,
    );

    window.addEventListener(
      'appinstalled',
      handleInstalled,
    );

    window.addEventListener(
      'bloom-kigali:pwa-update-ready',
      handleUpdate,
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleInstallPrompt,
      );

      window.removeEventListener(
        'appinstalled',
        handleInstalled,
      );

      window.removeEventListener(
        'bloom-kigali:pwa-update-ready',
        handleUpdate,
      );
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();

    const result =
      await installPrompt.userChoice;

    if (
      result.outcome ===
      'accepted'
    ) {
      setInstallPrompt(
        null,
      );
    }
  }

  return (
    <section className="w-full">
      <div className="flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--primary)]">
            App access
          </p>

          <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-[#222222] dark:text-[#F5F5F5]">
            Install Mama&apos;s Pride Boutique
          </h2>

          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280] dark:text-[#A3A3A3]">
            Add the system to this phone or computer for quicker access.
            Internet is still required for sales and business records.
          </p>
        </div>

        {isInstalled ? (
          <span className="shrink-0 text-sm font-black text-[#5F8A63] dark:text-[#79C27D]">
            Installed
          </span>
        ) : installPrompt ? (
          <button
            type="button"
            onClick={
              installApp
            }
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-black text-white transition hover:bg-[var(--primary-strong)]"
          >
            <Download
              className="h-4 w-4"
              aria-hidden="true"
            />

            Install app
          </button>
        ) : (
          <span className="shrink-0 text-sm font-bold text-[#6B7280] dark:text-[#A3A3A3]">
            Use browser menu to install
          </span>
        )}
      </div>

      {updateReady ? (
        <div className="mt-4 flex max-w-5xl flex-col gap-3 border-t border-neutral-100 pt-4 dark:border-[#343434] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[#222222] dark:text-[#F5F5F5]">
            A newer version of Mama&apos;s Pride Boutique is ready.
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 text-sm font-black text-[#222222] dark:border-[#343434] dark:text-[#F5F5F5]"
          >
            <RefreshCw
              className="h-4 w-4"
              aria-hidden="true"
            />

            Refresh now
          </button>
        </div>
      ) : null}
    </section>
  );
}
