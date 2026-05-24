import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type ProcessLike = {
  env?: Record<string, string | undefined>;
};

const runtimeProcess = (globalThis as { process?: ProcessLike }).process;

export const databaseUrl =
  runtimeProcess?.env?.DATABASE_URL ??
  'postgres://industrial:industrial@localhost:5432/industrial';

export const sqlClient = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 1,
  max: 1,
});

export const db = drizzle(sqlClient, { schema });