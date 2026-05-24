import { describe, expect, it } from 'vitest';
import { defaultDatabasePoolConfig, getDatabasePoolConfig } from './db';

describe('database pool config', () => {
  it('uses production-friendly defaults when env vars are absent', () => {
    expect(getDatabasePoolConfig({})).toEqual(defaultDatabasePoolConfig);
  });

  it('allows pool settings to be overridden through environment variables', () => {
    expect(
      getDatabasePoolConfig({
        DATABASE_CONNECT_TIMEOUT_SECONDS: '7',
        DATABASE_IDLE_TIMEOUT_SECONDS: '45',
        DATABASE_POOL_MAX: '16',
      }),
    ).toEqual({
      connect_timeout: 7,
      idle_timeout: 45,
      max: 16,
    });
  });
});