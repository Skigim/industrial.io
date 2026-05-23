import { describe, expect, it } from 'vitest';
import {
  buildingTypeSchema,
  clientMessageSchema,
  guestSessionResponseSchema,
  regionSummarySchema,
} from './index';

describe('contracts', () => {
  it('parses a region join message', () => {
    const parsed = clientMessageSchema.parse({
      type: 'region.join',
      regionId: 'starter-1',
      playerId: 'player-1',
    });

    expect(parsed.type).toBe('region.join');
  });

  it('parses a build placement message', () => {
    const parsed = clientMessageSchema.parse({
      type: 'build.place',
      regionId: 'starter-1',
      playerId: 'player-1',
      buildingType: 'smelter',
      tile: { x: 12, y: 8 },
    });

    if (parsed.type !== 'build.place') {
      throw new Error('Expected a build.place message');
    }

    expect(parsed.buildingType).toBe('smelter');
    expect(parsed.tile.x).toBe(12);
  });

  it('parses a guest session response', () => {
    const parsed = guestSessionResponseSchema.parse({
      playerId: 'player-1',
      sessionToken: 'token-1',
      regionId: 'starter-1',
    });

    expect(parsed.regionId).toBe('starter-1');
  });

  it('parses a region summary', () => {
    const parsed = regionSummarySchema.parse({
      regionId: 'starter-1',
      displayName: 'Starter Basin',
      recommended: true,
    });

    expect(parsed.displayName).toBe('Starter Basin');
  });

  it('parses supported building types', () => {
    expect(buildingTypeSchema.parse('site-anchor')).toBe('site-anchor');
    expect(buildingTypeSchema.parse('storage')).toBe('storage');
  });
});