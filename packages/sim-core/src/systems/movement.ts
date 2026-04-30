import type { MatchState, SimCommand } from "../types.js";

export function runMovement(_state: MatchState, _commands: readonly SimCommand[]): void {
  // Movement is intentionally a no-op in the bootstrap deterministic skeleton.
}