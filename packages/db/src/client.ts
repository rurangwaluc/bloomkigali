import { attachDatabasePool } from '@vercel/functions';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required. Add it to your environment before using the database.',
  );
}

const queryClient = new Pool({
  connectionString: databaseUrl,
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
});

if (process.env.VERCEL === '1') {
  attachDatabasePool(queryClient);
}

export const db = drizzle(queryClient, {
  schema,
});

export { queryClient };
