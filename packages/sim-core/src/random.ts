import seedrandom from "seedrandom";

import type { MatchState } from "./types.js";

const randomStateSymbol = Symbol("sim-core.random-state");

type MatchStateWithRandom = MatchState & {
  [randomStateSymbol]: seedrandom.PRNG;
};

export function attachRandomState(state: MatchState, seed: string): void {
  (state as MatchStateWithRandom)[randomStateSymbol] = seedrandom(seed);
}

export function nextRandom(state: MatchState): number {
  return (state as MatchStateWithRandom)[randomStateSymbol]();
}