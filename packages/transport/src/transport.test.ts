import { describe, expect, it } from 'vitest';
import { SegmentedBuffer, TransportArray, WakeQueue } from './index';

describe('transport runtime', () => {
  it('rejects non-positive segment sizes', () => {
    expect(() => new SegmentedBuffer<number>(0)).toThrow(
      'segmentSize must be a positive integer',
    );
    expect(() => new SegmentedBuffer<number>(-1)).toThrow(
      'segmentSize must be a positive integer',
    );
  });

  it('rejects non-integer and non-finite segment sizes', () => {
    expect(() => new SegmentedBuffer<number>(1.5)).toThrow(
      'segmentSize must be a positive integer',
    );
    expect(() => new SegmentedBuffer<number>(Number.POSITIVE_INFINITY)).toThrow(
      'segmentSize must be a positive integer',
    );
    expect(() => new SegmentedBuffer<number>(Number.NaN)).toThrow(
      'segmentSize must be a positive integer',
    );
  });

  it('pushes and shifts without copying the whole buffer', () => {
    const buffer = new SegmentedBuffer<number>(2);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    expect(buffer.shift()).toBe(1);
    expect(buffer.length).toBe(2);
  });

  it('can be reused after draining all segments', () => {
    const buffer = new SegmentedBuffer<number>(1);
    buffer.push(1);
    buffer.push(2);

    expect(buffer.shift()).toBe(1);
    expect(buffer.shift()).toBe(2);

    buffer.push(3);

    expect(buffer.shift()).toBe(3);
    expect(buffer.length).toBe(0);
  });

  it('dequeues items through the transport array wrapper', () => {
    const transportArray = new TransportArray<number>('line-1', 2);
    transportArray.enqueue(7);
    transportArray.enqueue(8);

    expect(transportArray.dequeue()).toBe(7);
    expect(transportArray.dequeue()).toBe(8);
    expect(transportArray.dequeue()).toBeUndefined();
  });

  it('prevents external mutation of the buffer length through the wrapper', () => {
    const transportArray = new TransportArray<number>('line-1', 2);
    transportArray.enqueue(7);
    transportArray.enqueue(8);

    expect(Reflect.set(transportArray.items, 'length', 0)).toBe(false);
    expect(transportArray.items.length).toBe(2);
    expect(transportArray.dequeue()).toBe(7);
    expect(transportArray.dequeue()).toBe(8);
  });

  it('respects a per-tick wake budget', () => {
    const queue = new WakeQueue();
    queue.enqueue('a');
    queue.enqueue('b');
    queue.enqueue('c');

    expect(queue.drain(2)).toEqual(['a', 'b']);
    expect(queue.drain(2)).toEqual(['c']);
  });

  it('rejects invalid wake drain budgets and preserves zero-budget drains', () => {
    const queue = new WakeQueue();
    queue.enqueue('a');
    queue.enqueue('b');

    expect(() => queue.drain(1.5)).toThrow(
      'limit must be a non-negative integer',
    );
    expect(() => queue.drain(Number.POSITIVE_INFINITY)).toThrow(
      'limit must be a non-negative integer',
    );
    expect(() => queue.drain(Number.NaN)).toThrow(
      'limit must be a non-negative integer',
    );
    expect(() => queue.drain(-1)).toThrow(
      'limit must be a non-negative integer',
    );

    expect(queue.drain(0)).toEqual([]);
    expect(queue.drain(10)).toEqual(['a', 'b']);
  });

  it('suppresses duplicate wakeups until an id is drained', () => {
    const queue = new WakeQueue();

    queue.enqueue('a');
    queue.enqueue('a');
    queue.enqueue('b');

    expect(queue.drain(10)).toEqual(['a', 'b']);

    queue.enqueue('a');

    expect(queue.drain(10)).toEqual(['a']);
  });

  it('preserves FIFO ordering across partial drains and re-enqueue', () => {
    const queue = new WakeQueue();

    queue.enqueue('a');
    queue.enqueue('b');
    queue.enqueue('c');
    queue.enqueue('d');

    expect(queue.drain(2)).toEqual(['a', 'b']);

    queue.enqueue('a');

    expect(queue.drain(2)).toEqual(['c', 'd']);
    expect(queue.drain(2)).toEqual(['a']);
  });
});