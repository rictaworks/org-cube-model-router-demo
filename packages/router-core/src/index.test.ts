import { describe, expect, it } from "vitest";

describe("packages/router-core エントリポイント", () => {
  it("index.ts を例外なく読み込める", async () => {
    const routerCore = await import("./index");

    expect(routerCore).toBeDefined();
  });

  it("関数A〜F実装前の雛形段階では、既知の公開エクスポートを持たない", async () => {
    const routerCore = await import("./index");

    expect(Object.keys(routerCore)).toEqual([]);
  });
});
