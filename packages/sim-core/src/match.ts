import { fnv1a32 } from "@industrial/net-protocol";

import { attachRandomState } from "./random.js";
import { runMovement } from "./systems/movement.js";
import { runProduction } from "./systems/production.js";
import type { MatchInput, MatchState, SimCommand } from "./types.js";

export function createMatch(input: MatchInput): MatchState {
  const state: MatchState = {
    tick: 0,
    seed: input.seed,
    resources: { p1: 100, p2: 100 }
  };

  attachRandomState(state, input.seed);

  return state;
}

export function stepMatch(
  state: MatchState,
  tick: number,
  commands: readonly SimCommand[]
): void {
  state.tick = tick;

  runMovement(state, commands);
  runProduction(state);
}

export function hashState(state: MatchState): number {
  return fnv1a32(
    JSON.stringify({
      tick: state.tick,
      resources: state.resources
    })
  );
}