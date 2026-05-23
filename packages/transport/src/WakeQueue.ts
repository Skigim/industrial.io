export class WakeQueue {
  private pending: string[] = [];
  private offset = 0;
  private seen = new Set<string>();

  enqueue(arrayId: string): void {
    if (this.seen.has(arrayId)) {
      return;
    }

    this.pending.push(arrayId);
    this.seen.add(arrayId);
  }

  drain(limit: number): string[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('limit must be a non-negative integer');
    }

    const end = Math.min(this.offset + limit, this.pending.length);
    const next = this.pending.slice(this.offset, end);

    for (const arrayId of next) {
      this.seen.delete(arrayId);
    }

    this.offset = end;

    if (this.offset >= this.pending.length) {
      this.pending = [];
      this.offset = 0;
    }

    return next;
  }
}