import type seedrandom from "seedrandom";

export type MatchInput = {
  seed: string;
};

export type SimCommand = {
  playerId: string;
  type: string;
};

export type MatchState = {
  tick: number;
  seed: string;
  rng: seedrandom.PRNG;
  resources: Record<string, number>;
};