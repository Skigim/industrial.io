import { z } from "zod";

const SafeIntegerSchema = z.number().int().safe();
export const NonEmptyIdSchema = z.string().refine((value) => value.trim().length > 0, {
  message: "ID cannot be empty"
});

export const JoinMatchCommandSchema = z.object({
  kind: z.literal("join_match"),
  preferredSpawn: z
    .object({ x: SafeIntegerSchema, y: SafeIntegerSchema })
    .strict()
    .optional()
}).strict();

export const SetRallyCommandSchema = z.object({
  kind: z.literal("set_rally"),
  x: SafeIntegerSchema,
  y: SafeIntegerSchema
}).strict();

export const QueueUnitCommandSchema = z.object({
  kind: z.literal("queue_unit"),
  factoryId: NonEmptyIdSchema,
  unitType: z.enum(["scout", "brute", "siege"]),
  quantity: SafeIntegerSchema.positive()
}).strict();

export const CommandSchema = z.discriminatedUnion("kind", [
  JoinMatchCommandSchema,
  SetRallyCommandSchema,
  QueueUnitCommandSchema
]);

export const CommandEnvelopeSchema = z.object({
  matchId: NonEmptyIdSchema,
  tick: SafeIntegerSchema.nonnegative(),
  senderId: NonEmptyIdSchema,
  command: CommandSchema
}).strict();

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;