import {
  getSyncableOperations,
  markOperationCompleted,
  markOperationFailed,
  markOperationSyncing,
} from './outbox';

const SYNC_ENDPOINT =
  '/api/sync/outbox';

const activeSyncs =
  new Map<
    string,
    Promise<void>
  >();

function emitSyncState(
  state:
    | 'offline'
    | 'idle'
    | 'syncing'
    | 'error',
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      'bloom-kigali:sync-state',
      {
        detail: {
          state,
        },
      },
    ),
  );
}

function retryDelay(
  previousAttempts: number,
) {
  const exponent =
    Math.min(
      previousAttempts,
      8,
    );

  return Math.min(
    30 * 60 * 1000,
    5_000 * 2 ** exponent,
  );
}

async function responseError(
  response: Response,
) {
  try {
    const data =
      (await response.json()) as {
        error?: unknown;
      };

    if (
      typeof data.error === 'string'
    ) {
      return data.error;
    }
  } catch {
    // Fall back to HTTP status.
  }

  return `Sync failed with HTTP ${response.status}.`;
}

async function performSync(
  userId: string,
) {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  if (!navigator.onLine) {
    emitSyncState('offline');
    return;
  }

  const operations =
    await getSyncableOperations(
      userId,
    );

  if (operations.length === 0) {
    emitSyncState('idle');
    return;
  }

  emitSyncState('syncing');

  for (const operation of operations) {
    await markOperationSyncing(
      operation.operationId,
    );

    try {
      const response = await fetch(
        SYNC_ENDPOINT,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
            Accept:
              'application/json',
          },
          body: JSON.stringify({
            operationId:
              operation.operationId,
            kind: operation.kind,
            payload:
              operation.payload,
            createdAt:
              operation.createdAt,
          }),
        },
      );

      if (response.ok) {
        await markOperationCompleted(
          operation.operationId,
        );

        continue;
      }

      const error =
        await responseError(
          response,
        );

      if (
        response.status === 400 ||
        response.status === 409 ||
        response.status === 422
      ) {
        await markOperationFailed(
          operation.operationId,
          error,
          null,
        );

        continue;
      }

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        await markOperationFailed(
          operation.operationId,
          error,
          Date.now() +
            60_000,
        );

        emitSyncState('error');
        return;
      }

      await markOperationFailed(
        operation.operationId,
        error,
        Date.now() +
          retryDelay(
            operation.attempts,
          ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Network sync failed.';

      await markOperationFailed(
        operation.operationId,
        message,
        Date.now() +
          retryDelay(
            operation.attempts,
          ),
      );

      if (!navigator.onLine) {
        emitSyncState(
          'offline',
        );

        return;
      }
    }
  }

  emitSyncState('idle');
}

export function runOutboxSync(
  userId: string,
) {
  const existing =
    activeSyncs.get(userId);

  if (existing) {
    return existing;
  }

  const syncPromise =
    performSync(userId).finally(
      () => {
        activeSyncs.delete(
          userId,
        );
      },
    );

  activeSyncs.set(
    userId,
    syncPromise,
  );

  return syncPromise;
}
