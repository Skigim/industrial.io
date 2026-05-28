export const buildingsById = {
  'site-anchor': { id: 'site-anchor', footprint: { w: 2, h: 2 } },
  'burner-generator': { id: 'burner-generator', fuelItemId: 'coal', powerOutputKw: 50 },
  miner: { id: 'miner', outputItemId: 'iron-ore', powerDrawKw: 8 },
  belt: { id: 'belt', throughputPerSecond: 4 },
  smelter: { id: 'smelter', recipeId: 'iron-ingot', powerDrawKw: 12 },
  constructor: { id: 'constructor', recipeId: 'construction-part', powerDrawKw: 12 },
  storage: { id: 'storage', capacity: 200 },
} as const;