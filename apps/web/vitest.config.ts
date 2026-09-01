/**
 * apps/web の Vitestプロジェクト設定（ルートの vitest.config.ts の test.projects から参照）。
 * apps/api（@cloudflare/vitest-pool-workers）と同様に、単独ファイルとして切り出す。
 */
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'web',
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: [path.join(import.meta.dirname, 'src/test-support/setupTests.ts')],
  },
});
