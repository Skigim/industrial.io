import seedrandom from "seedrandom";

import type { MatchState } from "./types.js";

export function createRandomState(seed: string): seedrandom.State.Arc4 {
  return seedrandom(seed, { state: true }).state();
}

export function nextRandom(state: MatchState): number {
  const random = seedrandom("", { state: state.rngState });
  const value = random();

  state.rngState = random.state();

  return value;
}
