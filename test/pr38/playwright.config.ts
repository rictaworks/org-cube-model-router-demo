/**
 * test/pr38 専用のPlaywright設定。
 *
 * PR #38（issue #35: apps/web フロントエンド一式）の「非エンジニア向けユーザーテスト」欄が
 * `http://localhost:5173/`（Vite dev serverの既定ポート）を明示しているため、ルートの
 * playwright.config.ts（並列実行時のポート衝突を避けるためポート4173を使う構成）とは
 * 別に、PR本文の記述と一致させた設定をここに用意する。
 *
 * 対象は開発サーバーのみ（本番・ステージング環境には実行しない）。
 * - apps/api（`wrangler dev`、既定ポート8787）
 * - apps/web（Vite dev server、既定ポート5173。apps/web/vite.config.ts のプロキシ設定により
 *   `/api` 配下は同一オリジンで apps/api へ転送される）
 */
import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 5173;
const API_PORT = 8787;
const WEB_BASE_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60000,
  expect: {
    timeout: 20000,
  },
  use: {
    baseURL: WEB_BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `npx wrangler d1 execute org-cube-model-router-demo --local --file=../../db/schema.sql && npx wrangler dev --port ${API_PORT}`,
      cwd: '../../apps/api',
      url: `http://localhost:${API_PORT}/api/dimensions`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: '../../apps/web',
      url: WEB_BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
