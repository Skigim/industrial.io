import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from './db';
import { RegionRepository } from './RegionRepository';

const createdSchemaNames: string[] = [];

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

const useTestSchema = async (): Promise<string> => {
  const schemaName = createTestSchemaName();
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`);
  await db.execute(sql`SET search_path TO ${sql.identifier(schemaName)}`);
  return schemaName;
};

const createTestRepository = async (): Promise<RegionRepository> => {
  const schemaName = await useTestSchema();
  createdSchemaNames.push(schemaName);
  await ensureSchema();
  return new RegionRepository();
};

afterAll(async () => {
  while (createdSchemaNames.length > 0) {
    const schemaName = createdSchemaNames.pop();

    if (!schemaName) {
      continue;
    }

    await db.execute(sql.raw(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`));
  }
});

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