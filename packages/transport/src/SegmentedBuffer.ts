type Segment<T> = {
  values: T[];
  next: Segment<T> | null;
};

export class SegmentedBuffer<T> {
  private head: Segment<T>;
  private tail: Segment<T>;
  private headIndex = 0;
  private lengthValue = 0;
  readonly segmentSize: number;

  constructor(segmentSize = 32) {
    if (!Number.isInteger(segmentSize) || segmentSize <= 0) {
      throw new Error('segmentSize must be a positive integer');
    }

    this.segmentSize = segmentSize;
    this.head = { values: [], next: null };
    this.tail = this.head;
  }

  get length(): number {
    return this.lengthValue;
  }

  push(value: T): void {
    if (this.tail.values.length >= this.segmentSize) {
      this.tail.next = { values: [], next: null };
      this.tail = this.tail.next;
    }

    this.tail.values.push(value);
    this.lengthValue += 1;
  }

  shift(): T | undefined {
    if (this.lengthValue === 0) {
      return undefined;
    }

    const value = this.head.values[this.headIndex];
    this.headIndex += 1;
    this.lengthValue -= 1;

    if (this.lengthValue === 0) {
      this.head = { values: [], next: null };
      this.tail = this.head;
      this.headIndex = 0;
      return value;
    }

    if (this.headIndex >= this.head.values.length && this.head.next) {
      this.head = this.head.next;
      this.headIndex = 0;
    }

    return value;
  }
}