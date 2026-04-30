import type { MatchState, SimCommand } from "../types.js";

const UNIT_RESOURCE_COST = {
  scout: 1,
  brute: 2,
  siege: 3
} as const;

export function runMovement(state: MatchState, commands: readonly SimCommand[]): void {
  for (const command of commands) {
    if (command.tick !== state.tick || command.command.kind !== "queue_unit") {
      continue;
    }

    const currentResources = state.resources[command.senderId] ?? 0;
    const totalCost =
      UNIT_RESOURCE_COST[command.command.unitType] * command.command.quantity;

    state.resources[command.senderId] = Math.max(0, currentResources - totalCost);
  }
}