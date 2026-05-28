export const recipesById = {
  'iron-ingot': {
    id: 'iron-ingot',
    durationMs: 4000,
    inputs: [{ itemId: 'iron-ore', amount: 1 }],
    outputs: [{ itemId: 'iron-ingot', amount: 1 }],
  },
  'construction-part': {
    id: 'construction-part',
    durationMs: 4000,
    inputs: [{ itemId: 'iron-ingot', amount: 1 }],
    outputs: [{ itemId: 'construction-part', amount: 1 }],
  },
} as const;