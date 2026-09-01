/**
 * apps/web の Vite設定。
 *
 * 開発時は apps/api（`wrangler dev`、既定ポート8787）へ `/api` 配下のリクエストを
 * プロキシする（ミッション本文「開発時は Vite の proxy 等で apps/api の wrangler dev に
 * 転送する構成にする」）。同一オリジンでプロキシすることで、Cookieセッション
 * （`credentials: 'include'`）がブラウザ・開発サーバー間で問題なく往復する。
 * 本番（Cloudflare Pages）では `/api` をWorkers APIへ振り向けるルーティングを
 * デプロイ側（Claude Desktop）で設定する想定であり、このリポジトリのCIには含めない
 * （CLAUDE.md：CDはこのリポジトリの責務外）。
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_API_DEV_SERVER_URL = 'http://localhost:8787';
const apiDevServerUrl = process.env.VITE_API_PROXY_TARGET ?? DEFAULT_API_DEV_SERVER_URL;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiDevServerUrl,
        changeOrigin: false,
      },
    },
  },
});
