/**
 * ルートのVitest設定。
 *
 * Vitest 4 では `vitest.workspace.ts`（`defineWorkspace`）は廃止され、単一の
 * `vitest.config.ts` の `test.projects` でプロジェクトを束ねる方式に統一された
 * （@cloudflare/vitest-pool-workers 0.22系もこの方式に追随している）。
 * apps/api/README.md の方針どおり、
 * - packages/router-core：Node環境の通常テスト（外部I/Oを持たない純粋ロジック）
 * - apps/api：@cloudflare/vitest-pool-workers によるWorkers環境の直接テスト
 * を1つの `npm run test` から実行する。
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        root: 'packages/router-core',
        test: {
          name: 'router-core',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      'apps/api/vitest.config.ts',
    ],
  },
});
