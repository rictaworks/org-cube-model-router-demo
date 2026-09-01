/**
 * テスト専用バインディング（TEST_MIGRATIONS）の型宣言。
 * apps/api/vitest.config.ts の miniflare.bindings で注入される
 * （本番の wrangler.toml には存在しない）。
 * トリプルスラッシュ参照は "cloudflare:test"（applyD1Migrations等）の型を
 * ルートの tsconfig.base.json でも解決できるようにするため。
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />

declare global {
  namespace Cloudflare {
    interface Env {
      readonly TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
    }
  }
}

export {};
