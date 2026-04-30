import { Packr } from "msgpackr";
import { describe, expect, it } from "vitest";
import {
  CommandEnvelopeSchema,
  decodeEnvelope,
  encodeEnvelope,
  fnv1a32,
  JoinMatchCommandSchema,
  QueueUnitCommandSchema,
  type CommandEnvelope
} from "../src";

describe("net-protocol", () => {
  it("matches the known FNV-1a checksum vector for hello", () => {
    expect(fnv1a32("hello")).toBe(0x4f9f2cab);
  });

  it("rejects unsafe integers in command fields", () => {
    expect(() =>
      CommandEnvelopeSchema.parse({
        matchId: "m-unsafe-tick",
        tick: Number.MAX_SAFE_INTEGER + 1,
        senderId: "p-unsafe",
        command: { kind: "set_rally", x: 5, y: 12 }
      })
    ).toThrow();

    expect(() =>
      CommandEnvelopeSchema.parse({
        matchId: "m-unsafe-x",
        tick: 1,
        senderId: "p-unsafe",
        command: {
          kind: "join_match",
          preferredSpawn: { x: Number.MAX_SAFE_INTEGER + 1, y: 9 }
        }
      })
    ).toThrow();

    expect(() =>
      QueueUnitCommandSchema.parse({
        kind: "queue_unit",
        factoryId: "f-unsafe",
        unitType: "scout",
        quantity: Number.MAX_SAFE_INTEGER + 1
      })
    ).toThrow();
  });

  it("rejects malformed command envelopes", () => {
    expect(() => JoinMatchCommandSchema.parse({ kind: "join" })).toThrow();
    expect(
      () =>
        QueueUnitCommandSchema.parse({
          kind: "queue_unit",
          factoryId: "f1",
          unitType: "scout",
          quantity: 0
        })
    ).toThrow();

    expect(() =>
      CommandEnvelopeSchema.parse({
        matchId: "m-extra",
        tick: 3,
        senderId: "p-extra",
        command: { kind: "set_rally", x: 5, y: 12, unexpected: true },
        unexpected: true
      })
    ).toThrow();

    expect(() =>
      CommandEnvelopeSchema.parse({
        matchId: "m-spawn",
        tick: 4,
        senderId: "p-spawn",
        command: {
          kind: "join_match",
          preferredSpawn: { x: 3, y: 9, unexpected: true }
        }
      })
    ).toThrow();
  });

  it("rejects empty and whitespace-only IDs", () => {
    expect(() =>
      CommandEnvelopeSchema.parse({
        matchId: "",
        tick: 3,
        senderId: "player-1",
        command: { kind: "set_rally", x: 5, y: 12 }
      })
    ).toThrow();

    expect(() =>
      CommandEnvelopeSchema.parse({
        matchId: "match-1",
        tick: 3,
        senderId: "   ",
        command: { kind: "set_rally", x: 5, y: 12 }
      })
    ).toThrow();

    expect(() =>
      QueueUnitCommandSchema.parse({
        kind: "queue_unit",
        factoryId: "\t",
        unitType: "scout",
        quantity: 1
      })
    ).toThrow();
  });

  it.each<CommandEnvelope>([
    {
      matchId: "m1",
      tick: 10,
      senderId: "p1",
      command: { kind: "set_rally", x: 5, y: 12 }
    },
    {
      matchId: "m2",
      tick: 22,
      senderId: "p2",
      command: {
        kind: "join_match",
        preferredSpawn: { x: 3, y: 9 }
      }
    },
    {
      matchId: "m3",
      tick: 48,
      senderId: "p3",
      command: {
        kind: "queue_unit",
        factoryId: "factory-7",
        unitType: "siege",
        quantity: 2
      }
    }
  ])("round-trips command envelopes for %o", (envelope) => {
    expect(decodeEnvelope(encodeEnvelope(envelope))).toEqual(envelope);
  });

  it("rejects malformed decoded payloads", () => {
    const bytes = new Packr().pack({
      matchId: "m4",
      tick: 7,
      senderId: "p4",
      command: { kind: "teleport", x: 1, y: 2 }
    });

    expect(() => decodeEnvelope(bytes)).toThrow();
  });
});