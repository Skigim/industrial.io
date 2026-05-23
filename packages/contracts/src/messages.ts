import { z } from 'zod';

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
    regionId: z.string().min(1),
    playerId: z.string().min(1),
  }),
  z.object({
    type: z.literal('build.place'),
    regionId: z.string().min(1),
    playerId: z.string().min(1),
    buildingType: buildingTypeSchema,
    tile: z.object({
      x: z.number().int(),
      y: z.number().int(),
    }),
  }),
]);