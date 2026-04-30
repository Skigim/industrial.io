import { fnv1a32, type CommandEnvelope } from "@industrial/net-protocol";
import { describe, expect, it } from "vitest";
import { createMatch, hashState, stepMatch } from "../src";

function compareByCodeUnit(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function stableStringifyByCodeUnit(value: unknown): string {
  if (value === undefined) {
    return "null";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringifyByCodeUnit(entry)).join(",")}]`;
  }

  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([leftKey], [rightKey]) => compareByCodeUnit(leftKey, rightKey));

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringifyByCodeUnit(entryValue)}`
    )
    .join(",")}}`;
}

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
  it("distinguishes states that have identical visible fields but different rng progress", () => {
    const baseline = createMatch({ seed: "seed-1" });
    const advanced = createMatch({ seed: "seed-1" });

    stepMatch(advanced, 0, []);

    advanced.tick = baseline.tick;
    advanced.resources = { ...baseline.resources };

    expect(hashState(baseline)).not.toBe(hashState(advanced));
  });

  it("can resume deterministically from serialized match state", () => {
    const commands = new Map<number, readonly CommandEnvelope[]>([
      [2, [queueUnitCommand(2, "p1", 1)]],
      [5, [queueUnitCommand(5, "p2", 2)]],
      [8, [queueUnitCommand(8, "p1", 1)]]
    ]);
    const original = createMatch({ seed: "seed-1" });

    for (let tick = 0; tick < 4; tick += 1) {
      stepMatch(original, tick, commands.get(tick) ?? []);
    }

    const resumed = structuredClone(original) as ReturnType<typeof createMatch>;

    for (let tick = 4; tick < 12; tick += 1) {
      const commandsForTick = commands.get(tick) ?? [];

      stepMatch(original, tick, commandsForTick);
      stepMatch(resumed, tick, commandsForTick);
    }

    expect(hashState(original)).toBe(hashState(resumed));
  });

  it("produces identical hash for same seed and command stream", () => {
    const commands = new Map<number, readonly CommandEnvelope[]>([
      [4, [queueUnitCommand(4, "p1", 2)]],
      [17, [queueUnitCommand(17, "p2", 1)]],
      [29, [queueUnitCommand(29, "p1", 3)]]
    ]);

    expect(runTicks("seed-1", commands)).toBe(runTicks("seed-1", commands));
  });

  it("produces identical hash for semantically equivalent per-tick command orderings", () => {
    const ordered = new Map<number, readonly CommandEnvelope[]>([
      [
        0,
        [
          queueUnitCommand(0, "x", 1),
          queueUnitCommand(0, "y", 1)
        ]
      ]
    ]);
    const reversed = new Map<number, readonly CommandEnvelope[]>([
      [
        0,
        [
          queueUnitCommand(0, "y", 1),
          queueUnitCommand(0, "x", 1)
        ]
      ]
    ]);

    expect(runTicks("seed-1", ordered)).toBe(runTicks("seed-1", reversed));
  });

  it("canonicalizes unicode-bearing ids with locale-independent ordering", () => {
    const ordered = createMatch({ seed: "seed-1" });
    const reversed = createMatch({ seed: "seed-1" });
    const orderedCommands = [queueUnitCommand(0, "z", 1), queueUnitCommand(0, "ä", 1)];
    const reversedCommands = [queueUnitCommand(0, "ä", 1), queueUnitCommand(0, "z", 1)];

    stepMatch(ordered, 0, orderedCommands);
    stepMatch(reversed, 0, reversedCommands);

    const expectedHash = fnv1a32(stableStringifyByCodeUnit(ordered));

    expect(hashState(ordered)).toBe(expectedHash);
    expect(hashState(reversed)).toBe(expectedHash);
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