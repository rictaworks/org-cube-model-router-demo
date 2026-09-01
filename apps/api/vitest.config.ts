/**
 * apps/api の @cloudflare/vitest-pool-workers 設定。
 *
 * db/schema.sql をそのまま1件のマイグレーションとして読み込み（`db/` ディレクトリを
 * migrationsPath に指定）、テスト用バインディング TEST_MIGRATIONS 経由で
 * src/test-support/applyMigrations.ts に渡してWorkers環境内で適用する。
 */
import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrationsPath = path.join(import.meta.dirname, '../../db');
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        wrangler: {
          configPath: './wrangler.toml',
        },
        miniflare: {
          // テスト専用バインディング（本番のwrangler.tomlには存在しない）。
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      name: 'api',
      include: ['src/**/*.test.ts'],
      setupFiles: ['./src/test-support/applyMigrations.ts'],
    },
  };
});
