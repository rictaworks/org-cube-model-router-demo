# test/pr37

PR #37（`apps/api`: Workers API一式 F1〜F10・セッション・D1リポジトリ・日次リセット・
ハニーポット）の、PR本文「非エンジニア向けユーザーテスト」欄の手順を再現する自動化スクリプトです。

対象は開発サーバー（`http://localhost:8787`）のみです。本番・ステージング環境には
実行しません。

## 事前準備（開発サーバーの起動）

`ENV/DEVELOPMENT.md` にはローカル環境情報のみが記載されており、`wrangler dev` の
具体的な起動コマンドは `apps/api/wrangler.toml`・`apps/api/package.json` から判断しています。

```bash
cd apps/api

# D1ローカルDBへスキーマを適用（初回のみ・または schema.sql 変更時）
npx wrangler d1 execute org-cube-model-router-demo --local --file=../../db/schema.sql

# 開発サーバー起動（既定ポート: 8787）
npm run dev
# または
npx wrangler dev
```

`model_catalog`（モデルカタログ）はマスタデータで、`catalogSeedMiddleware` が
初回リクエスト時に `data/model_catalog.json` から自動投入します（手動での投入は不要です）。

## 実行方法

```bash
bash test/pr37/run.sh
```

`BASE_URL` 環境変数で対象URLを変更できます（既定値: `http://localhost:8787`）。

## 手順とアサーションの対応

PR本文の「非エンジニア向けユーザーテスト」欄の番号と1対1で対応させています。

| PR本文の手順 | 確認内容 | スクリプト内の対応 |
|---|---|---|
| 1. `GET /api/models` | Aster-L・Aster-Sなど複数モデルの名前・価格情報が表示される | ステータス200、`displayName` にAster-L/Aster-Sを含む、`priceInPer1k`/`priceOutPer1k` を含む、モデル件数が2件以上 |
| 2. `GET /api/dimensions` | `{"dimensions":[]}` とだけ表示される | ステータス200かつ本文が完全一致 |
| 3. `GET /api/tasks` | `{"tasks":[]}` とだけ表示される | ステータス200かつ本文が完全一致 |

## 実行結果（確認済み）

`tester` agentがブランチ `feat/34-apps-api-impl` 上で開発サーバーを起動し実行した結果、
全アサーションがgreenであることを確認済みです（2026-09-02時点）。
