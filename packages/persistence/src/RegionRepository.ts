import { and, eq, notInArray } from 'drizzle-orm';
import { db } from './db.js';
import {
  boundaryBuffers,
  type BoundaryBufferItem,
  regionSnapshots,
} from './schema.js';

export type BoundaryBufferSnapshot = {
  boundaryId: string;
  items: BoundaryBufferItem[];
};

export type RegionSnapshotRecord = {
  regionId: string;
  snapshot: unknown;
  boundaryBuffers: BoundaryBufferSnapshot[];
};

export class RegionRepository {
  async saveRegionSnapshot(input: RegionSnapshotRecord): Promise<void> {
    await db.transaction(async (transaction) => {
      const updatedAt = new Date();
      const boundaryIds = input.boundaryBuffers.map((buffer) => buffer.boundaryId);

      await transaction
        .insert(regionSnapshots)
        .values({
          regionId: input.regionId,
          snapshot: input.snapshot,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: regionSnapshots.regionId,
          set: {
            snapshot: input.snapshot,
            updatedAt,
          },
        });

      if (boundaryIds.length > 0) {
        await transaction.delete(boundaryBuffers).where(
          and(
            eq(boundaryBuffers.regionId, input.regionId),
            notInArray(boundaryBuffers.boundaryId, boundaryIds),
          ),
        );
      } else {
        await transaction
          .delete(boundaryBuffers)
          .where(eq(boundaryBuffers.regionId, input.regionId));
      }

      for (const buffer of input.boundaryBuffers) {
        await transaction
          .insert(boundaryBuffers)
          .values({
            boundaryId: buffer.boundaryId,
            regionId: input.regionId,
            contents: { items: buffer.items },
            updatedAt,
          })
          .onConflictDoUpdate({
            target: [boundaryBuffers.regionId, boundaryBuffers.boundaryId],
            set: {
              contents: { items: buffer.items },
              updatedAt,
            },
          });
      }
    });
  }

  async loadRegionSnapshot(regionId: string): Promise<RegionSnapshotRecord | null> {
    const snapshotRow = await db.query.regionSnapshots.findFirst({
      where: eq(regionSnapshots.regionId, regionId),
    });

    if (!snapshotRow) {
      return null;
    }

    const bufferRows = await db.query.boundaryBuffers.findMany({
      where: eq(boundaryBuffers.regionId, regionId),
    });

    return {
      regionId,
      snapshot: snapshotRow.snapshot,
      boundaryBuffers: bufferRows.map((row) => ({
        boundaryId: row.boundaryId,
        items: row.contents.items,
      })),
    };
  }
}
