import { z } from 'zod';

export const guestSessionResponseSchema = z.object({
  playerId: z.string().min(1),
  sessionToken: z.string().min(1),
  regionId: z.string().min(1),
});

export const regionSummarySchema = z.object({
  regionId: z.string().min(1),
  displayName: z.string().min(1),
  recommended: z.boolean(),
});