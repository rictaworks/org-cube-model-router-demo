# packages/router-core

ポリシー解決・候補評価・割当決定（純粋ロジック）。現時点では未着手。

- `requirements.md` 4章の関数A〜Fに対応するロジックをここに実装する
- 外部I/O（DB・HTTP）を持たない純粋関数として実装し、`apps/api` から呼び出す
- 実装コードは `packages/router-core/src/` 配下に置く
- テストは Vitest。`requirements.md` 5章のモデルカタログ・5.3節のサンプル組織を
  フィクスチャとして使う
