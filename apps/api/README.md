# apps/api

Workers API（次元・ポリシー・タスク・割当・リセット）。requirements.md 2章の機能一覧
F1〜F10と、共通基盤（セッション発行・D1リポジトリ・日次リセット・ハニーポット）を実装済み。

- 実装コードは `apps/api/src/` 配下に置く（テストも同ディレクトリに `*.test.ts` として同居する。
  `packages/router-core` の既存の配置方針に合わせている）
- ロジック本体（ポリシー解決・候補評価・割当決定）は
  [packages/router-core](../../packages/router-core/README.md) の純粋関数（関数A〜F）を
  そのまま呼び出す。`apps/api` はHTTPハンドラとD1永続化に徹し、判定ロジックを
  再実装しない
- 実装したエンドポイントは、実装したPRの中で [README.md](../../README.md) のAPI一覧に追記する

## 技術構成

- ルーティング：[Hono](https://hono.dev/)（Cloudflare Workers向けの軽量・実績のある
  ルーティングライブラリ）。手書きのfetchハンドラで賄うには、Cookie処理・パスパラメータ・
  サブルータ構成が10エンドポイント超に渡り煩雑になるため採用した（DOCS/DP.mdの
  YAGNI/車輪の再発明回避を踏まえ、機能を絞った薄いライブラリを選定）
- DB：Cloudflare D1（`db/schema.sql` を正とする。このリポジトリでは変更しない）
- テスト：`@cloudflare/vitest-pool-workers`（Vitest 4系対応の `cloudflareTest` プラグイン）で
  Workers環境（Miniflare上のD1を含む）を直接テストする

## セッション（requirements.md 1.4・13.3節）

- 初回アクセス時に `crypto.randomUUID()` で不透明なセッションIDを発行し、Cookie
  （`session_id`、httpOnly・SameSite=Lax）で保持する
- `model_catalog` を除く全テーブルの読み書きは、常にリクエストのセッションIDで
  絞り込む（`apps/api/src/repositories/*.ts`）。他セッションのデータには一切
  アクセスしない

## 日次リセット（requirements.md 4.8節）

- リクエスト受付時（`apps/api/src/middleware.ts` の `sessionMiddleware`）に、
  セッションの前回リセット日時と「直近のJST 03:00」を比較し
  （`apps/api/src/dailyReset.ts`）、リセットが必要であればセッションの全データ
  （`model_catalog` を除く）を削除してから処理を続行する
- `model_catalog` はマスタデータであり、日次リセットの対象外とする
  （`apps/api/src/repositories/sessionRepository.ts` の `deleteAllSessionData`）

## ハニーポット（requirements.md 13.4節）

- `HONEYPOT_FIELD_NAME`（`apps/api/src/config.ts`）という名前のフィールドを、
  POST/PUT/PATCHのJSON本文が持ち、かつ値が入っている場合はリクエストを400で
  即座に破棄する（`apps/api/src/middleware.ts` の `honeypotMiddleware`）
- 判定理由は握りつぶさず `console.error` にログを残す。クライアントへは
  ハニーポットの存在を明かさない汎用メッセージのみを返す

## モデルカタログの投入

`model_catalog` テーブルはマスタデータであり日次リセットの対象外だが、
D1のテスト環境やデプロイ直後は空の状態から始まる。リクエスト受付時のミドルウェア
（`catalogSeedMiddleware`）が `model_catalog` の件数を確認し、空であれば
`data/model_catalog.json` から冪等に投入する（`apps/api/src/repositories/catalogRepository.ts`
の `ensureCatalogSeeded`）。

## エンドポイント一覧

すべて `/api` 配下。リクエスト・レスポンスはJSON。認証は持たない
（セッションIDはCookieで自動的に授受される）。

| 機能 | メソッド・パス | 概要 |
|---|---|---|
| F1 次元管理 | `GET /api/dimensions` | 次元・値の一覧取得 |
| F1 次元管理 | `POST /api/dimensions` | 次元を追加 |
| F1 次元管理 | `PATCH /api/dimensions/:id` | 次元を改名 |
| F1 次元管理 | `GET /api/dimensions/:id/impact` | 次元削除の影響プレビュー（DBは変更しない） |
| F1 次元管理 | `DELETE /api/dimensions/:id` | 次元を削除（参照ポリシーは無効化、座標は除去） |
| F1 次元管理 | `POST /api/dimensions/:id/values` | 値を追加 |
| F1 次元管理 | `PATCH /api/dimensions/:id/values/:valueId` | 値を改名 |
| F1 次元管理 | `DELETE /api/dimensions/:id/values/:valueId` | 値を削除（参照があれば拒否） |
| F2 ポリシー管理 | `GET /api/policies` | ポリシー一覧取得 |
| F2 ポリシー管理 | `POST /api/policies` | ポリシーを作成 |
| F2 ポリシー管理 | `PATCH /api/policies/:id` | ポリシーを更新（無効化状態はセレクタ編集で再有効化） |
| F2 ポリシー管理 | `DELETE /api/policies/:id` | ポリシーを削除 |
| F3 タスク管理 | `GET /api/tasks` | タスク一覧取得 |
| F3 タスク管理 | `GET /api/tasks/:id` | タスク詳細取得 |
| F3 タスク管理 | `POST /api/tasks` | タスクを登録（登録直後に割当を計算） |
| F3 タスク管理 | `PATCH /api/tasks/:id` | タスクを更新 |
| F3 タスク管理 | `DELETE /api/tasks/:id` | タスクを削除 |
| F4 モデルカタログ | `GET /api/models` | カタログ閲覧（セッション内の提供停止状態を含む） |
| F4 モデルカタログ | `PATCH /api/models/:modelId` | 提供停止の切替 |
| F5 割当計算 | `GET /api/assignments` | 全タスクの割当結果一覧 |
| F6 根拠表示 | `GET /api/tasks/:id/assignment` | 得点内訳・次点候補・除外理由・適用ポリシー |
| F7 固定割当 | `POST /api/tasks/:id/pin` | モデルを固定（制約を満たさない場合は409） |
| F7 固定割当 | `DELETE /api/tasks/:id/pin` | 固定を解除 |
| F8 変更影響 | `GET /api/change-impacts` | 直近1回分の変更影響一覧 |
| F9 組織ビュー | `GET /api/org-view` | 任意の2次元（省略時は1次元／0次元）のクロス集計 |
| F10 サンプル読込 | `POST /api/sample/load` | 空のセッションにサンプル組織を投入 |

## テストの実行

```bash
npm run test --workspace apps/api
# またはリポジトリルートから
npm run test
```

ルートの `vitest.config.ts`（`test.projects`）が `packages/router-core`（Node環境の
通常テスト）と `apps/api`（`@cloudflare/vitest-pool-workers` によるWorkers環境の
直接テスト）の両方を束ねている。
