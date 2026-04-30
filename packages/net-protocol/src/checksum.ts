export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; ) {
    const codePoint = input.codePointAt(i);

    if (codePoint === undefined) {
      break;
    }

    hash ^= codePoint;
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);

    i += codePoint > 0xffff ? 2 : 1;
  }

  return hash >>> 0;
}