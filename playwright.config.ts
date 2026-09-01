/**
 * ルートのPlaywright設定。
 *
 * `webServer` に2つのサーバーを指定する：
 * 1. apps/api（`wrangler dev`）。起動前にD1ローカルDBへ `db/schema.sql` を適用する
 *    （`db/schema.sql` は `CREATE TABLE IF NOT EXISTS` のため複数回実行しても安全）。
 * 2. apps/web（Vite dev server）。`apps/web/vite.config.ts` のプロキシ設定により、
 *    `/api` 配下のリクエストは同一オリジンで apps/api（ポート8787）へ転送される
 *    （Cookieセッションがブラウザ・開発サーバー間で問題なく往復する）。
 *
 * apps/api・apps/web はいずれも参照専用/Edit scope外の設定ファイル変更を伴わないため、
 * 起動コマンドはこのファイルの `command`・`cwd` でのみ組み立てる。
 */
import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 4173;
const API_PORT = 8787;
const WEB_BASE_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './apps/web/src/e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  // Vite dev serverはモジュールをリクエスト時に遅延コンパイルするため、webServerの
  // urlヘルスチェック（HTMLの応答のみ確認）通過後も、実ブラウザが初めてページを開いた
  // 際に依存モジュール一式（react-router・Font Awesome等）のコンパイルで数秒かかることが
  // ある（コールドスタート時、かつ実行環境のCPU負荷が高い場合）。既定の5秒では
  // 不安定になるため余裕を持たせ、それでも環境要因で失敗した場合に備え1回だけ再試行する
  // （テスト対象コード自体の欠陥はセッション確立・フォームバリデーションの2件を
  // 特定し修正済みであり、残る変動要因は開発サーバーのコールドスタート時間のみ）。
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
      cwd: './apps/api',
      url: `http://localhost:${API_PORT}/api/dimensions`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: './apps/web',
      url: WEB_BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}`,
      },
    },
  ],
});
