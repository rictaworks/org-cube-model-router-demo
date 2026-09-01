# packages/router-core

ポリシー解決・候補評価・割当決定（純粋ロジック）。

## 雛形構築（完了）

npm workspace（`router-core`）としてパッケージ雛形を構築しました。

- `package.json`：`npm run test`（Vitest）・`npm run typecheck`（tsc）を用意しています
- `tsconfig.json`：ルートの `tsconfig.base.json` を継承しています
- `vitest.config.ts`：Node環境でのテストを行います（外部I/Oを持たないため
  `@cloudflare/vitest-pool-workers` は使用しません）
- `src/index.ts`：エントリポイントです。現時点では空のエクスポートのみです
- `src/index.test.ts`：モジュールを例外なく読み込めることを確認するスモークテストです

- 関数A〜Fに対応するロジックは、以降のissueで本雛形の上に実装します
- 外部I/O（DB・HTTP）を持たない純粋関数として実装し、`apps/api` から呼び出します
- 実装コードは `packages/router-core/src/` 配下に置きます
- テストは Vitest。`requirements.md` 5章のモデルカタログ・5.3節のサンプル組織を
  フィクスチャとして使う予定です
