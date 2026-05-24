import { jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export type BoundaryBufferItem = {
  itemId: string;
  amount: number;
};

export type BoundaryBufferContents = {
  items: BoundaryBufferItem[];
};

export const regionSnapshots = pgTable('region_snapshots', {
  regionId: text('region_id').primaryKey(),
  snapshot: jsonb('snapshot').$type<unknown>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const boundaryBuffers = pgTable('boundary_buffers', {
  boundaryId: text('boundary_id').notNull(),
  regionId: text('region_id').notNull(),
  contents: jsonb('contents').$type<BoundaryBufferContents>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  primaryKey: primaryKey({ columns: [table.regionId, table.boundaryId] }),
}));