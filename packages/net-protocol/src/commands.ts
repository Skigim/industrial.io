import { z } from "zod";

export const JoinMatchCommandSchema = z.object({
  kind: z.literal("join_match"),
  preferredSpawn: z.object({ x: z.number().int(), y: z.number().int() }).optional()
});

export const SetRallyCommandSchema = z.object({
  kind: z.literal("set_rally"),
  x: z.number().int(),
  y: z.number().int()
});

export const QueueUnitCommandSchema = z.object({
  kind: z.literal("queue_unit"),
  factoryId: z.string(),
  unitType: z.enum(["scout", "brute", "siege"]),
  quantity: z.number().int().positive()
});

export const CommandSchema = z.discriminatedUnion("kind", [
  JoinMatchCommandSchema,
  SetRallyCommandSchema,
  QueueUnitCommandSchema
]);

export const CommandEnvelopeSchema = z.object({
  matchId: z.string(),
  tick: z.number().int().nonnegative(),
  senderId: z.string(),
  command: CommandSchema
});

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;