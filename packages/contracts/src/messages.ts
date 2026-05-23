import { z } from 'zod';

export const MAX_IDENTIFIER_LENGTH = 128;
export const MIN_TILE_INDEX = 0;
export const MAX_TILE_INDEX = 1023;

const identifierSchema = z.string().min(1).max(MAX_IDENTIFIER_LENGTH);
const tileCoordinateSchema = z.number().int().min(MIN_TILE_INDEX).max(MAX_TILE_INDEX);

export const buildingTypeSchema = z.enum([
  'site-anchor',
  'burner-generator',
  'miner',
  'belt',
  'smelter',
  'storage',
]);

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('region.join'),
    regionId: identifierSchema,
    playerId: identifierSchema,
  }),
  z.object({
    type: z.literal('build.place'),
    regionId: identifierSchema,
    playerId: identifierSchema,
    buildingType: buildingTypeSchema,
    tile: z.object({
      x: tileCoordinateSchema,
      y: tileCoordinateSchema,
    }),
  }),
]);