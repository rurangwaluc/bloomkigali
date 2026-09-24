import { randomUUID } from 'node:crypto';
import {
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@bloom-kigali/db/client';
import { products } from '@bloom-kigali/db/schema';
import { requireUser } from '@/lib/auth/session';
import {
  getR2BucketName,
  getR2Client,
} from '@/lib/r2/client';
import {
  isProductImageType,
  productImageExtension,
  PRODUCT_IMAGE_MAX_BYTES,
} from '@/lib/r2/product-images';

export const runtime = 'nodejs';

const PRODUCT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PresignBody = {
  productId?: unknown;
  contentType?: unknown;
  size?: unknown;
};

type ConfirmBody = {
  productId?: unknown;
  imageKey?: unknown;
};

function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  await requireUser();

  let body: PresignBody;

  try {
    body = await request.json();
  } catch {
    return badRequest(
      'Invalid upload request.',
    );
  }

  if (
    typeof body.productId !== 'string' ||
    !PRODUCT_ID_PATTERN.test(
      body.productId,
    )
  ) {
    return badRequest(
      'Invalid product.',
    );
  }

  if (
    typeof body.contentType !== 'string' ||
    !isProductImageType(
      body.contentType,
    )
  ) {
    return badRequest(
      'Use a JPG, PNG, or WebP image.',
    );
  }

  if (
    typeof body.size !== 'number' ||
    !Number.isFinite(body.size) ||
    body.size <= 0 ||
    body.size > PRODUCT_IMAGE_MAX_BYTES
  ) {
    return badRequest(
      'Image must be 5 MB or smaller.',
    );
  }

  const [product] = await db
    .select({
      id: products.id,
    })
    .from(products)
    .where(
      eq(
        products.id,
        body.productId,
      ),
    )
    .limit(1);

  if (!product) {
    return NextResponse.json(
      { error: 'Product not found.' },
      { status: 404 },
    );
  }

  const extension =
    productImageExtension(
      body.contentType,
    );

  const imageKey =
    `products/${product.id}/${randomUUID()}.${extension}`;

  const client = getR2Client();
  const bucketName =
    getR2BucketName();

  const uploadUrl =
    await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: imageKey,
        ContentType:
          body.contentType,
      }),
      {
        expiresIn: 300,
      },
    );

  return NextResponse.json({
    uploadUrl,
    imageKey,
    expiresIn: 300,
  });
}

export async function PATCH(
  request: Request,
) {
  await requireUser();

  let body: ConfirmBody;

  try {
    body = await request.json();
  } catch {
    return badRequest(
      'Invalid image confirmation.',
    );
  }

  if (
    typeof body.productId !== 'string' ||
    !PRODUCT_ID_PATTERN.test(
      body.productId,
    )
  ) {
    return badRequest(
      'Invalid product.',
    );
  }

  if (
    typeof body.imageKey !== 'string' ||
    !body.imageKey.startsWith(
      `products/${body.productId}/`,
    )
  ) {
    return badRequest(
      'Invalid product image.',
    );
  }

  const [product] = await db
    .select({
      id: products.id,
    })
    .from(products)
    .where(
      eq(
        products.id,
        body.productId,
      ),
    )
    .limit(1);

  if (!product) {
    return NextResponse.json(
      { error: 'Product not found.' },
      { status: 404 },
    );
  }

  const client = getR2Client();
  const bucketName =
    getR2BucketName();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: body.imageKey,
      }),
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'The uploaded image could not be verified.',
      },
      { status: 400 },
    );
  }

  await db
    .update(products)
    .set({
      imageKey: body.imageKey,
      updatedAt: new Date(),
    })
    .where(
      eq(
        products.id,
        product.id,
      ),
    );

  return NextResponse.json({
    ok: true,
    imageKey: body.imageKey,
  });
}
