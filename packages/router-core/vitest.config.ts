import { defineConfig } from "vitest/config";

/**
 * packages/router-core 用の Vitest 設定。
 * 本パッケージは外部I/O（DB・HTTP）を持たない純粋関数のみで構成されるため、
 * Workers ランタイム（@cloudflare/vitest-pool-workers）は使用せず、
 * 通常の Node 環境でテストする。
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
