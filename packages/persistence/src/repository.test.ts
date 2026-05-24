import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from './db';
import { RegionRepository } from './RegionRepository';

const createTestSchemaName = (): string =>
  `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const ensureSchema = async (): Promise<void> => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS region_snapshots (
      region_id text PRIMARY KEY,
      snapshot jsonb NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS boundary_buffers (
      region_id text NOT NULL,
      boundary_id text NOT NULL,
      contents jsonb NOT NULL,
      updated_at timestamptz NOT NULL,
      PRIMARY KEY (region_id, boundary_id)
    )
  `);
};

const useTestSchema = async (): Promise<void> => {
  const schemaName = createTestSchemaName();
  await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));
  await db.execute(sql.raw(`SET search_path TO "${schemaName}"`));
};

const createTestRepository = async (): Promise<RegionRepository> => {
  await useTestSchema();
  await ensureSchema();
  return new RegionRepository();
};

describe('region repository', () => {
  it('round-trips a region snapshot and boundary buffer', async () => {
    const repository = await createTestRepository();

    await repository.saveRegionSnapshot({
      regionId: 'starter-1',
      snapshot: { storage: { 'iron-plate': 2 } },
      boundaryBuffers: [
        {
          boundaryId: 'starter-1:east',
          items: [{ itemId: 'iron-ore', amount: 3 }],
        },
      ],
    });

    const loaded = await repository.loadRegionSnapshot('starter-1');
    expect(loaded?.boundaryBuffers[0]?.items[0]?.amount).toBe(3);
  });

  it('replaces boundary buffers on subsequent saves for the same region', async () => {
    const repository = await createTestRepository();

    await repository.saveRegionSnapshot({
      regionId: 'starter-1',
      snapshot: { storage: { coal: 4 } },
      boundaryBuffers: [
        {
          boundaryId: 'starter-1:east',
          items: [{ itemId: 'iron-ore', amount: 3 }],
        },
        {
          boundaryId: 'starter-1:west',
          items: [{ itemId: 'coal', amount: 1 }],
        },
      ],
    });

    await repository.saveRegionSnapshot({
      regionId: 'starter-1',
      snapshot: { storage: { coal: 2 } },
      boundaryBuffers: [
        {
          boundaryId: 'starter-1:east',
          items: [{ itemId: 'iron-plate', amount: 5 }],
        },
      ],
    });

    const loaded = await repository.loadRegionSnapshot('starter-1');
    expect(loaded?.snapshot).toEqual({ storage: { coal: 2 } });
    expect(loaded?.boundaryBuffers).toEqual([
      {
        boundaryId: 'starter-1:east',
        items: [{ itemId: 'iron-plate', amount: 5 }],
      },
    ]);
  });

  it('keeps same boundary IDs isolated by region', async () => {
    const repository = await createTestRepository();

    await repository.saveRegionSnapshot({
      regionId: 'starter-1',
      snapshot: { storage: { coal: 1 } },
      boundaryBuffers: [
        {
          boundaryId: 'east',
          items: [{ itemId: 'coal', amount: 2 }],
        },
      ],
    });

    await repository.saveRegionSnapshot({
      regionId: 'starter-2',
      snapshot: { storage: { coal: 3 } },
      boundaryBuffers: [
        {
          boundaryId: 'east',
          items: [{ itemId: 'iron-ore', amount: 4 }],
        },
      ],
    });

    await expect(repository.loadRegionSnapshot('starter-1')).resolves.toEqual({
      regionId: 'starter-1',
      snapshot: { storage: { coal: 1 } },
      boundaryBuffers: [
        {
          boundaryId: 'east',
          items: [{ itemId: 'coal', amount: 2 }],
        },
      ],
    });

    await expect(repository.loadRegionSnapshot('starter-2')).resolves.toEqual({
      regionId: 'starter-2',
      snapshot: { storage: { coal: 3 } },
      boundaryBuffers: [
        {
          boundaryId: 'east',
          items: [{ itemId: 'iron-ore', amount: 4 }],
        },
      ],
    });
  });
});