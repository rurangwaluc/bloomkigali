import { NextResponse } from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth/session';

import {
  OFFLINE_OPERATION_KINDS,
  type OfflineOperationKind,
} from '@/lib/offline/types';

export const runtime = 'nodejs';

const MAX_BODY_LENGTH =
  512 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SyncBody = {
  operationId?: unknown;
  kind?: unknown;
  payload?: unknown;
  createdAt?: unknown;
};

function errorResponse(
  error: string,
  status: number,
) {
  return NextResponse.json(
    { error },
    { status },
  );
}

function isOfflineOperationKind(
  value: unknown,
): value is OfflineOperationKind {
  return (
    typeof value === 'string' &&
    (
      OFFLINE_OPERATION_KINDS as readonly string[]
    ).includes(value)
  );
}

export async function POST(
  request: Request,
) {
  const user =
    await getCurrentUser();

  if (!user) {
    return errorResponse(
      'Your session has expired.',
      401,
    );
  }

  const rawBody =
    await request.text();

  if (
    rawBody.length >
    MAX_BODY_LENGTH
  ) {
    return errorResponse(
      'Sync request is too large.',
      413,
    );
  }

  let body: SyncBody;

  try {
    body = JSON.parse(
      rawBody,
    ) as SyncBody;
  } catch {
    return errorResponse(
      'Invalid sync request.',
      400,
    );
  }

  if (
    typeof body.operationId !== 'string' ||
    !UUID_PATTERN.test(
      body.operationId,
    )
  ) {
    return errorResponse(
      'Invalid operation ID.',
      400,
    );
  }

  if (
    !isOfflineOperationKind(
      body.kind,
    )
  ) {
    return errorResponse(
      'Invalid operation type.',
      400,
    );
  }

  if (
    typeof body.createdAt !== 'number' ||
    !Number.isFinite(
      body.createdAt,
    ) ||
    body.createdAt <= 0
  ) {
    return errorResponse(
      'Invalid operation time.',
      400,
    );
  }

  /*
   * Business handlers are enabled one module at a time.
   * Never acknowledge an offline write until that module
   * has its real transactional/idempotent implementation.
   */
  return errorResponse(
    'Offline sync for this action is not enabled yet.',
    422,
  );
}
