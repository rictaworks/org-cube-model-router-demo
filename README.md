# org-cube-model-router-demo

多次元組織テーブル × タスク → 最適AIモデル マッピング（デモ版）

- 最終更新：2026-09-01 21:58 JST
- 文字コード：UTF-8
- 詳細設計：[requirements.md](./requirements.md) を正とする（[SPEC/](./SPEC/README.md) 参照）
- 連絡先：info@rictaworks.jp（個人名での連絡先記載は行わない）

## このデモについて

組織の次元（部門・拠点・職種など）× ポリシー × タスク属性 × モデルカタログを
突き合わせ、タスクごとに最適なAIモデルをルールベースで決定し、選定理由・除外理由・
変更影響を可視化する展示物。実際のAIモデル呼び出しは行わない。詳細は
[requirements.md](./requirements.md) を参照。

## 自動ログイン

このデモは認証機能を持たない（[requirements.md 1.4](./requirements.md#14-デモ版の適用制約)）。
「自動ログイン」とは ID・パスワードの自動入力を指すのではなく、**初回アクセス時に
ブラウザへ不透明なセッションIDが自動発行され、Cookieで保持される**ことを指す。
発行されたセッションIDが全テーブルのオーナーキーとなり、他セッションのデータは
参照・操作できない（[requirements.md 13.3](./requirements.md#133-データと個人情報)）。
利用者が明示的に行う操作（ログインフォームの入力等）は存在しない。

## 実装済みの基盤

画面・APIに先立ち、デモ版全体の基盤層を実装済みです。詳細は各READMEを参照してください。

- `db/schema.sql`：D1（SQLite互換）スキーマ。`requirements.md` 6章の全12テーブル
  （sessions・dimensions・dimension_values・policies・policy_selectors・tasks・
  task_positions・model_catalog・model_overrides・assignments・
  assignment_candidates・change_impacts）
- `data/model_catalog.json`：モデルカタログ（架空の6モデルとタスク種別ごとの能力）
- `data/sample_org.json`：サンプル組織（次元3・ポリシー6・タスク12件）
- `packages/router-core/`：ポリシー解決・候補評価・割当決定を担う純粋ロジック
  （関数A〜F）。外部I/O（DB・HTTP）を一切持たず、実際のAIモデル呼び出しも行いません。
  詳細は [packages/router-core/README.md](./packages/router-core/README.md) を参照

これらは内部ロジック・マスタデータであり、来場者が操作する画面・APIはまだ実装していません。

## ページ一覧

実装が完了したページから、実装したPRの中で本表に追記する。
`README.md` には未実装のページを記載しない（[CLAUDE.md](./CLAUDE.md) 参照）。

| ページ名 | URL |
|---|---|
| （実装され次第、当該PRで追記） | — |

## API一覧

実装が完了したAPIから、実装したPRの中で本表に追記する。
`README.md` には未実装のAPIを記載しない（[CLAUDE.md](./CLAUDE.md) 参照）。
詳細は [apps/api/README.md](./apps/api/README.md) を参照。

| タイトル | エンドポイントURL | 仕様（SPEC/） |
|---|---|---|
| F1 次元一覧取得 | `GET /api/dimensions` | requirements.md 4.1節 |
| F1 次元追加 | `POST /api/dimensions` | requirements.md 4.1節 |
| F1 次元改名 | `PATCH /api/dimensions/:id` | requirements.md 4.1節 |
| F1 次元削除の影響プレビュー | `GET /api/dimensions/:id/impact` | requirements.md 4.1節 |
| F1 次元削除 | `DELETE /api/dimensions/:id` | requirements.md 4.1節 |
| F1 値追加 | `POST /api/dimensions/:id/values` | requirements.md 4.1節 |
| F1 値改名 | `PATCH /api/dimensions/:id/values/:valueId` | requirements.md 4.1節 |
| F1 値削除 | `DELETE /api/dimensions/:id/values/:valueId` | requirements.md 4.1節 |
| F2 ポリシー一覧取得 | `GET /api/policies` | requirements.md 3.3節 |
| F2 ポリシー作成 | `POST /api/policies` | requirements.md 3.3節 |
| F2 ポリシー更新 | `PATCH /api/policies/:id` | requirements.md 3.3節 |
| F2 ポリシー削除 | `DELETE /api/policies/:id` | requirements.md 3.3節 |
| F3 タスク一覧取得 | `GET /api/tasks` | requirements.md 3.5節 |
| F3 タスク詳細取得 | `GET /api/tasks/:id` | requirements.md 3.5節 |
| F3 タスク登録 | `POST /api/tasks` | requirements.md 3.5節 |
| F3 タスク更新 | `PATCH /api/tasks/:id` | requirements.md 3.5節 |
| F3 タスク削除 | `DELETE /api/tasks/:id` | requirements.md 3.5節 |
| F4 モデルカタログ閲覧 | `GET /api/models` | requirements.md 3.4節 |
| F4 提供停止切替 | `PATCH /api/models/:modelId` | requirements.md 3.4節 |
| F5 割当結果一覧 | `GET /api/assignments` | requirements.md 4.5節 |
| F6 根拠表示 | `GET /api/tasks/:id/assignment` | requirements.md 4.3・4.4節 |
| F7 固定割当 | `POST /api/tasks/:id/pin` | requirements.md 4.7節 |
| F7 固定解除 | `DELETE /api/tasks/:id/pin` | requirements.md 4.7節 |
| F8 変更影響取得 | `GET /api/change-impacts` | requirements.md 4.6節 |
| F9 組織ビュー | `GET /api/org-view` | requirements.md 13.2節 |
| F10 サンプル読込 | `POST /api/sample/load` | requirements.md 5.3節 |

## 開発に参加する

開発フロー・ブランチ運用・コーディング規約は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照。

## リポジトリ構成

```
org-cube-model-router-demo/
├── apps/web/             # フロントエンド（Cloudflare Pages）
├── apps/api/              # Workers API
├── packages/router-core/  # ポリシー解決・候補評価・割当決定（純粋ロジック）
├── data/                  # モデルカタログ・サンプル組織（マスタデータ）
├── db/                    # D1スキーマ
├── SPEC/                  # 仕様書・リバースエンジニアリング図（公開）
├── app-ui/                # デザインモック配置場所（提供時のみ）
├── ENV/                   # 開発・本番環境情報（非公開）
├── TASKS/ DEBUG/ CLIENT/ WORK/ DELETE/  # 運用ノウハウ（非公開）
└── README.md
```
