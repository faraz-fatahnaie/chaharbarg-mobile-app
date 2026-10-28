// Kept separate from vite.config.ts: vitest ships its own vite copy, which breaks type-checking if mixed.
export default { test: { include: ['src/**/*.test.ts'] } };
