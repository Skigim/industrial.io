import { describe, expect, it } from "vitest";
import {
  decodeEnvelope,
  encodeEnvelope,
  JoinMatchCommandSchema,
  type CommandEnvelope
} from "../src";

describe("net-protocol", () => {
  it("rejects malformed command envelopes", () => {
    expect(() => JoinMatchCommandSchema.parse({ kind: "join" })).toThrow();
  });

  it("round-trips command envelopes", () => {
    const envelope: CommandEnvelope = {
      matchId: "m1",
      tick: 10,
      senderId: "p1",
      command: { kind: "set_rally", x: 5, y: 12 }
    };
    const bytes = encodeEnvelope(envelope);
    const decoded = decodeEnvelope(bytes);
    expect(decoded).toEqual(envelope);
  });
});