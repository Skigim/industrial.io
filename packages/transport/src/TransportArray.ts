import { SegmentedBuffer } from './SegmentedBuffer';

export class TransportArray<T> {
  readonly id: string;
  readonly items: SegmentedBuffer<T>;

  constructor(id: string, segmentSize = 32) {
    this.id = id;
    this.items = new SegmentedBuffer<T>(segmentSize);
  }

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }
}