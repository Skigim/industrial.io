import { stepRegion, type RegionState } from '@industrial/sim-core';
import { WakeQueue } from '@industrial/transport';

export class RegionRuntimeHost {
  private readonly wakeQueue = new WakeQueue();

  tick(region: RegionState, deltaMs: number): RegionState {
    const wakeBudget = 50;
    this.wakeQueue.drain(wakeBudget);
    return stepRegion(region, deltaMs);
  }
}