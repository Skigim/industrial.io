import type { CommandEnvelope } from "@industrial/net-protocol";

export type MatchInput = {
  seed: string;
};

export type SimCommand = CommandEnvelope;

export type MatchState = {
  tick: number;
  seed: string;
  resources: Record<string, number>;
};