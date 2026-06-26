import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts', 'tests/unit/**/*.spec.ts'],
    // 複数の int テストファイルが同一の SQLite DB へ並列にスキーマ push を行うと
    // テーブル/インデックスの作成が競合するため、ファイル間は順次実行する。
    fileParallelism: false,
  },
})
