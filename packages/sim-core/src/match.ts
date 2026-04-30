import { fnv1a32 } from "@industrial/net-protocol";

import { createRandomState } from "./random.js";
import { runMovement } from "./systems/movement.js";
import { runProduction } from "./systems/production.js";
import type { MatchInput, MatchState, SimCommand } from "./types.js";

function compareByCodeUnit(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return "null";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([leftKey], [rightKey]) => compareByCodeUnit(leftKey, rightKey));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

function compareCommands(left: SimCommand, right: SimCommand): number {
  return compareByCodeUnit(stableStringify(left), stableStringify(right));
}

export function createMatch(input: MatchInput): MatchState {
  const state: MatchState = {
    tick: 0,
    seed: input.seed,
    rngState: createRandomState(input.seed),
    resources: { p1: 100, p2: 100 }
  };

  return state;
}

export function stepMatch(
  state: MatchState,
  tick: number,
  commands: readonly SimCommand[]
): void {
  state.tick = tick;

  const orderedCommands = [...commands].sort(compareCommands);

  runMovement(state, orderedCommands);
  runProduction(state);
}

export function hashState(state: MatchState): number {
  return fnv1a32(stableStringify(state));
}
