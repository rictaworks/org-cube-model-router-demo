# db

D1（SQLite互換）スキーマ置き場です。

- `schema.sql` — `requirements.md` 6章のテーブル定義（sessions, dimensions, dimension_values,
  policies, policy_selectors, tasks, task_positions, model_catalog, model_overrides,
  assignments, assignment_candidates, change_impacts）を実装しています。
  - `model_catalog`（モデルカタログ）を除く全テーブルにセッションID（オーナーキー）列を
    持たせ、13.3節の方針どおり読み書きを自セッションのIDで絞り込めるようにしています。
  - テーブル間の参照はすべてID（外部キー）で保持しています。
  - 集合・一覧を扱う列（許可リージョン、禁止モデル、理由コード一覧など）はJSON文字列
    （TEXT）として保持しています。
- `schema.test.ts` — `schema.sql` のCREATE文がエラーなく実行できること、12テーブルすべてが
  定義されていること、セッションID列の有無、外部キー参照の整合性を Vitest（`node:sqlite`）
  で検証するテストです。`npm run test` で実行できます。
