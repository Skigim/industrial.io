import type { CommandEnvelope } from "@industrial/net-protocol";
import { describe, expect, it } from "vitest";
import { createMatch, hashState, stepMatch } from "../src";

function queueUnitCommand(
  tick: number,
  senderId: string,
  quantity: number
): CommandEnvelope {
  return {
    matchId: "match-1",
    tick,
    senderId,
    command: {
      kind: "queue_unit",
      factoryId: "factory-1",
      unitType: "scout",
      quantity
    }
  };
}

function runTicks(seed: string, commandsByTick: ReadonlyMap<number, readonly CommandEnvelope[]>) {
  const match = createMatch({ seed });

  for (let tick = 0; tick < 300; tick += 1) {
    stepMatch(match, tick, commandsByTick.get(tick) ?? []);
  }

  return hashState(match);
}

describe("sim-core determinism", () => {
  it("produces identical hash for same seed and command stream", () => {
    const commands = new Map<number, readonly CommandEnvelope[]>([
      [4, [queueUnitCommand(4, "p1", 2)]],
      [17, [queueUnitCommand(17, "p2", 1)]],
      [29, [queueUnitCommand(29, "p1", 3)]]
    ]);

    expect(runTicks("seed-1", commands)).toBe(runTicks("seed-1", commands));
  });

  it("produces a different hash for a different command stream", () => {
    const baseline = new Map<number, readonly CommandEnvelope[]>([
      [4, [queueUnitCommand(4, "p1", 2)]],
      [17, [queueUnitCommand(17, "p2", 1)]]
    ]);
    const changed = new Map<number, readonly CommandEnvelope[]>([
      [4, [queueUnitCommand(4, "p1", 3)]],
      [17, [queueUnitCommand(17, "p2", 1)]]
    ]);

    expect(runTicks("seed-1", baseline)).not.toBe(runTicks("seed-1", changed));
  });

  it("produces a different hash for a different seed", () => {
    const commands = new Map<number, readonly CommandEnvelope[]>([
      [4, [queueUnitCommand(4, "p1", 2)]],
      [17, [queueUnitCommand(17, "p2", 1)]]
    ]);

    expect(runTicks("seed-1", commands)).not.toBe(runTicks("seed-2", commands));
  });
});