import { z } from "zod";

export const JoinMatchCommandSchema = z.object({
  kind: z.literal("join_match"),
  preferredSpawn: z
    .object({ x: z.number().int(), y: z.number().int() })
    .strict()
    .optional()
}).strict();

export const SetRallyCommandSchema = z.object({
  kind: z.literal("set_rally"),
  x: z.number().int(),
  y: z.number().int()
}).strict();

export const QueueUnitCommandSchema = z.object({
  kind: z.literal("queue_unit"),
  factoryId: z.string(),
  unitType: z.enum(["scout", "brute", "siege"]),
  quantity: z.number().int().positive()
}).strict();

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
}).strict();

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;