import { nextRandom } from "../random.js";
import type { MatchState } from "../types.js";

export function runProduction(state: MatchState): void {
  const gain = Math.floor(nextRandom(state) * 2);

  state.resources.p1 += gain;
  state.resources.p2 += gain;
}