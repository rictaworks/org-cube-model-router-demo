/**
 * @cloudflare/vitest-pool-workers のセットアップファイル。
 * db/schema.sql（apps/api/vitest.config.ts で1件のマイグレーションとして読み込み済み）を
 * D1へ適用する。setupFilesはWorkers環境内で複数回呼ばれ得るが、
 * applyD1Migrations は未適用分のみを適用するため冪等である。
 */
import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
