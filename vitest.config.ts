import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Frontend-Tests liegen unter src/, Backend-Tests als .mts unter scripts/arena/.
    include: ['src/**/*.test.ts', 'scripts/arena/**/*.test.mts'],
    environment: 'node',
  },
});
