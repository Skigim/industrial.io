import assert from "node:assert/strict";

import { createMatch, hashState, stepMatch } from "@industrial/sim-core";

const match = createMatch({ seed: "smoke-seed" });
const initialHash = hashState(match);

stepMatch(match, 0, [
  {
    matchId: "smoke-match",
    tick: 0,
    senderId: "p1",
    command: {
      kind: "queue_unit",
      factoryId: "factory-1",
      unitType: "scout",
      quantity: 2
    }
  }
]);

assert.equal(match.tick, 0);
assert.notEqual(hashState(match), initialHash);
assert.equal(match.resources.p2 - match.resources.p1, 2);