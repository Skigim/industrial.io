import { Packr, Unpackr } from "msgpackr";
import { CommandEnvelope, CommandEnvelopeSchema } from "./commands";

const packr = new Packr();
const unpackr = new Unpackr();

export function encodeEnvelope(envelope: CommandEnvelope): Uint8Array {
  return packr.pack(CommandEnvelopeSchema.parse(envelope));
}

export function decodeEnvelope(bytes: Uint8Array): CommandEnvelope {
  return CommandEnvelopeSchema.parse(unpackr.unpack(bytes));
}