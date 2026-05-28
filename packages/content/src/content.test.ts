import { describe, expect, it } from 'vitest';
import { buildingsById, itemsById, recipesById } from './index';

describe('starter content', () => {
  it('includes a powered ore-to-parts chain', () => {
    expect(buildingsById['burner-generator']).toBeDefined();
    expect(buildingsById.miner.outputItemId).toBe('iron-ore');
    expect(recipesById['iron-ingot'].inputs[0].itemId).toBe('iron-ore');
    expect(recipesById['construction-part'].inputs[0].itemId).toBe('iron-ingot');
  });

  it('defines the starter ore-to-parts chain', () => {
    expect(buildingsById.smelter.recipeId).toBe('iron-ingot');
    expect(buildingsById.constructor.recipeId).toBe('construction-part');
    expect(recipesById['iron-ingot']).toMatchObject({
      inputs: [{ itemId: 'iron-ore', amount: 1 }],
      outputs: [{ itemId: 'iron-ingot', amount: 1 }],
    });
    expect(recipesById['construction-part']).toMatchObject({
      inputs: [{ itemId: 'iron-ingot', amount: 1 }],
      outputs: [{ itemId: 'construction-part', amount: 1 }],
    });
  });

  it('defines the expected starter content keys', () => {
    expect(new Set(Object.keys(itemsById))).toEqual(new Set(['coal', 'iron-ore', 'iron-ingot', 'construction-part']));
    expect(new Set(Object.keys(recipesById))).toEqual(new Set(['iron-ingot', 'construction-part']));
    expect(new Set(Object.keys(buildingsById))).toEqual(new Set([
      'site-anchor',
      'burner-generator',
      'miner',
      'belt',
      'smelter',
      'constructor',
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
    expect(recipesById[buildingsById.constructor.recipeId]).toBeDefined();
    expect(itemsById[recipesById['iron-ingot'].outputs[0].itemId]).toBeDefined();
    expect(itemsById[recipesById['construction-part'].outputs[0].itemId]).toBeDefined();
  });
});