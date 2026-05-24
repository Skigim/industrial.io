import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type ProcessLike = {
  env?: Record<string, string | undefined>;
};

const runtimeProcess = (globalThis as { process?: ProcessLike }).process;

const readPositiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const databaseUrl =
  runtimeProcess?.env?.DATABASE_URL ??
  'postgres://industrial:industrial@localhost:5432/industrial';

export const defaultDatabasePoolConfig = {
  connect_timeout: 5,
  idle_timeout: 30,
  max: 10,
} as const;

export const getDatabasePoolConfig = (
  env: Record<string, string | undefined> = runtimeProcess?.env ?? {},
) => ({
  connect_timeout: readPositiveInteger(
    env.DATABASE_CONNECT_TIMEOUT_SECONDS,
    defaultDatabasePoolConfig.connect_timeout,
  ),
  idle_timeout: readPositiveInteger(
    env.DATABASE_IDLE_TIMEOUT_SECONDS,
    defaultDatabasePoolConfig.idle_timeout,
  ),
  max: readPositiveInteger(
    env.DATABASE_POOL_MAX,
    defaultDatabasePoolConfig.max,
  ),
});

export const databasePoolConfig = getDatabasePoolConfig();

export const sqlClient = postgres(databaseUrl, databasePoolConfig);

export const db = drizzle(sqlClient, { schema });