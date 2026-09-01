# apps/api

Workers API（次元・ポリシー・タスク・割当・リセット）。現時点では未着手。

- 実装コードは `apps/api/src/` 配下に置く（開発用スクリプトは `src/` の外）
- ロジック本体（ポリシー解決・候補評価・割当決定）は [packages/router-core](../../packages/router-core/README.md) を参照する純粋関数として実装し、`apps/api` はHTTPハンドラに徹する
- 実装したエンドポイントは、実装したPRの中で [README.md](../../README.md) のAPI一覧に追記する
