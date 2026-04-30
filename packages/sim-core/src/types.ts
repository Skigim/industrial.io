import type { CommandEnvelope } from "@industrial/net-protocol";
import type seedrandom from "seedrandom";

export type MatchInput = {
  seed: string;
};

export type SimCommand = CommandEnvelope;

export type MatchState = {
  tick: number;
  seed: string;
  rngState: seedrandom.State.Arc4;
  resources: Record<string, number>;
};
