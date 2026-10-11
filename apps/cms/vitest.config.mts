import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts', 'tests/unit/**/*.spec.ts'],
    // Multiple int test files pushing schema to the same SQLite DB in parallel
    // race on table/index creation, so run files sequentially.
    fileParallelism: false,
  },
})
