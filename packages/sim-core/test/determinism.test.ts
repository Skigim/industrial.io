import { describe, expect, it } from "vitest";
import { createMatch, hashState, stepMatch } from "../src";

describe("sim-core determinism", () => {
  it("produces identical hash for same seed and commands", () => {
    const a = createMatch({ seed: "seed-1" });
    const b = createMatch({ seed: "seed-1" });

    for (let tick = 0; tick < 300; tick += 1) {
      stepMatch(a, tick, []);
      stepMatch(b, tick, []);
    }

    expect(hashState(a)).toBe(hashState(b));
  });
});