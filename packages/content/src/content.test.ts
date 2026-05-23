import { describe, expect, it } from 'vitest';
import { buildingsById, itemsById, recipesById } from './index';

describe('starter content', () => {
  it('includes a powered ore-to-plate chain', () => {
    expect(buildingsById['burner-generator']).toBeDefined();
    expect(buildingsById.miner.outputItemId).toBe('iron-ore');
    expect(recipesById['iron-plate'].inputs[0].itemId).toBe('iron-ore');
  });

  it('defines the expected starter content keys', () => {
    expect(new Set(Object.keys(itemsById))).toEqual(new Set(['coal', 'iron-ore', 'iron-plate']));
    expect(new Set(Object.keys(recipesById))).toEqual(new Set(['iron-plate']));
    expect(new Set(Object.keys(buildingsById))).toEqual(new Set([
      'site-anchor',
      'burner-generator',
      'miner',
      'belt',
      'smelter',
      'storage',
    ]));
  });

  it('keeps lookup keys aligned with embedded ids', () => {
    for (const [itemId, item] of Object.entries(itemsById)) {
      expect(item.id).toBe(itemId);
    }

    for (const [recipeId, recipe] of Object.entries(recipesById)) {
      expect(recipe.id).toBe(recipeId);
    }

    for (const [buildingId, building] of Object.entries(buildingsById)) {
      expect(building.id).toBe(buildingId);
    }
  });

  it('keeps recipe and building references internally consistent', () => {
    expect(itemsById[buildingsById['burner-generator'].fuelItemId]).toBeDefined();
    expect(itemsById[buildingsById.miner.outputItemId]).toBeDefined();
    expect(recipesById[buildingsById.smelter.recipeId]).toBeDefined();
    expect(itemsById[recipesById['iron-plate'].outputs[0].itemId]).toBeDefined();
  });
});