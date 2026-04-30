import assert from "node:assert/strict";

import {
  CommandEnvelopeSchema,
  decodeEnvelope,
  encodeEnvelope,
  fnv1a32
} from "@industrial/net-protocol";

const envelope = {
  matchId: "smoke-match",
  tick: 12,
  senderId: "smoke-player",
  command: { kind: "queue_unit", factoryId: "factory-1", unitType: "scout", quantity: 2 }
};

assert.equal(fnv1a32("hello"), 0x4f9f2cab);
assert.deepEqual(decodeEnvelope(encodeEnvelope(envelope)), envelope);
assert.throws(() =>
  CommandEnvelopeSchema.parse({
    ...envelope,
    command: { kind: "set_rally", x: 1, y: 2, unexpected: true }
  })
);