'use client';

import { useEffect } from 'react';

import {
  cleanupCompletedOperations,
  resetStaleSyncingOperations,
} from '@/lib/offline/outbox';

import {
  runOutboxSync,
} from '@/lib/offline/sync';

type OfflineSyncManagerProps = {
  userId: string;
};

export function OfflineSyncManager({
  userId,
}: OfflineSyncManagerProps) {
  useEffect(() => {
    let disposed = false;

    async function sync() {
      if (disposed) {
        return;
      }

      await runOutboxSync(
        userId,
      );
    }

    async function initialize() {
      await resetStaleSyncingOperations(
        userId,
      );

      await cleanupCompletedOperations(
        userId,
      );

      await sync();
    }

    function handleOnline() {
      void sync();
    }

    function handleOutboxChanged() {
      void sync();
    }

    function handleFocus() {
      void sync();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void sync();
      }
    }

    void initialize();

    window.addEventListener(
      'online',
      handleOnline,
    );

    window.addEventListener(
      'bloom-kigali:outbox-changed',
      handleOutboxChanged,
    );

    window.addEventListener(
      'focus',
      handleFocus,
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );

    const interval =
      window.setInterval(
        () => {
          void sync();
        },
        60_000,
      );

    return () => {
      disposed = true;

      window.clearInterval(
        interval,
      );

      window.removeEventListener(
        'online',
        handleOnline,
      );

      window.removeEventListener(
        'bloom-kigali:outbox-changed',
        handleOutboxChanged,
      );

      window.removeEventListener(
        'focus',
        handleFocus,
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
    };
  }, [userId]);

  return null;
}
