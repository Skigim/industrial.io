import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	{
		test: {
			name: 'workspace',
			include: ['apps/**/*.test.ts?(x)', 'packages/**/*.test.ts', 'services/**/*.test.ts'],
		},
	},
]);