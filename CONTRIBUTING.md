# CONTRIBUTING

## ブランチ運用

- `main` ブランチでの直接作業を禁止する。作業は必ずトピックブランチを切って行う。
- `apps/*/src/**`・`packages/*/src/**`（以下 `src/**`）を含む変更は、必ずブランチを切り
  **プルリクエスト（PR）を作成**すること。`main` への直接pushは禁止する。
- `src/**` を含まない変更（`SPEC/`・`TASKS/`・`README.md` などドキュメント類）は
  `main` への直接pushを許可する。ただし迷った場合はPRを作成する。
- PRは `main` へのマージ前に、Claude Codeのローカルセッションで `reviewer` /
  `pr-checker` agent（[.claude/agents/reviewer.md](./.claude/agents/reviewer.md)・
  [.claude/agents/pr-checker.md](./.claude/agents/pr-checker.md)）によるレビューを実施し、
  判定を `WORK/reviews/pr<PR番号>.md` に記録すること（org内の他リポジトリと同じ運用。
  GitHub Actions上でclaude-code-actionを用いた自動実行は行わない — 過去に
  `.github/workflows/pr-checks.yml` として骨組みを置いていたが、認証手段が整備できず
  一度も成立しなかったため `DELETE/` へ退避した）。

## TDD（厳守）

実装は必ず次の順序で行う。

1. **plan** — 何をテストし、何を実装するかを先に言語化する
2. **red test** — 先に失敗するテストを書く（Vitest / Playwright）
3. **coding** — テストを通す最小限の実装を書く
4. **green test** — テストが通ることを確認する。通らないままコミットしない

フロントエンドの確認は次の手段で行う（ブラウザの手動確認だけに頼らない）。

- `curl` — レスポンスヘッダ・ステータスコード・JSONの確認
- `wget --mirror` — 静的ページの構成・リンク切れの確認
- Playwright — 実ブラウザでのE2E確認

## 実装規約

- 実装コードは各パッケージの `src/` 配下に置く（例：`apps/web/src/`、`apps/api/src/`、
  `packages/router-core/src/`）。開発用スクリプト・ツールは `src/` の外に置く。
- 制御構文・条件構文（if/for/while等の本体そのもの）以外のロジックは、必ずクラスまたは
  関数に切り出す。処理をトップレベルに書き流さない。
- グローバル変数は禁止する（セキュリティ上の理由。状態は必ずクラス・関数のスコープに閉じる）。
- 文字列リテラル（メッセージ・設定値・UI文言）はコードに直書きせず設定ファイルに分離する。
  ハードコードされていないことをチェックするテストを書く（検出スクリプトの導入は別issue）。
- **フォールバック禁止**。想定外の状態を握りつぶして代替値で継続しない。例外は種類ごとに
  捕捉し、原因が分かるメッセージ・ログを添えて上位に伝播させるか、明示的にエラー表示する。
- デバッグトレースができるよう、処理の分岐点・外部境界（DB・API呼び出し等）でログを残す。
- アイコンは Font Awesome を使用する。絵文字はUIに使用しない。
- ネイティブの `alert()` / `confirm()` / `prompt()` は使用禁止（[CLAUDE.md](./CLAUDE.md) 参照）。
- 本番／開発の環境判定ロジックを実装し分岐可能にする。開発環境はテスト可能にするため
  認証済み相当に分岐する（本デモは認証を持たないため直接の適用対象はない）。
- 環境変数は `.env` を参照する（値をコードに直書きしない）。秘密情報の扱いは
  [CLAUDE.md](./CLAUDE.md) のシークレット管理ルールに従う。
- メンテナンスコストとセキュリティの観点から、安全なライブラリ・フレームワーク・OSS・SaaSを
  使い、車輪の再発明を避けてオリジナルコードを少なく保つ。

## 品質・セキュリティ・テスト手法の参照

実装・レビュー時は以下を都度参照する。

- 品質チェックリスト：[.claude/QC10.md](./.claude/QC10.md)
- セキュリティチェックリスト（OWASP Top 10）：[.claude/OWASP10.md](./.claude/OWASP10.md)
- コンプライアンスチェックリスト：[.claude/CC.md](./.claude/CC.md)
- テストメソッド・フレームワーク概要：[DOCS/TM.md](./DOCS/TM.md)
- デザイン原則（CRAP）：[DOCS/DP.md](./DOCS/DP.md)
- テストハーネス自作時の安全性：[.claude/TEST-HARNESS-SAFETY.md](./.claude/TEST-HARNESS-SAFETY.md)

動画に関する機能を開発する場合は `MM/` ディレクトリのメソッド一式を必ず参照すること
（本デモの現行スコープに動画機能は無いため、該当機能追加時のみ適用）。

## デザインモック

事前にデザイン指定がある場合、`app-ui/` にモックが配置される。アプリ実装時はこの
モックを `src/` 側に再現したうえで、実際のロジックへ接続する。`app-ui/` 自体は
参照専用でありEdit scopeに含めない。

## コミット前チェック

コミット前に必ずセキュリティレビュー（OWASP10 / QC10 観点）を行う。
`.claude/settings.json` の hook により、レビュー未実施の状態での `git commit` は
自動的にブロックされる（[.claude/hooks/pre-commit-security-guard.sh](./.claude/hooks/pre-commit-security-guard.sh)）。
レビュー後、指示に従って `.claude/.last-security-review` を更新してから再度コミットする。

## PR作成時の注意

- PR本文には、非エンジニア（来場者・クライアント）が実際に画面を操作して確認できる
  手順を丁寧に書く（PRテンプレート [.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md) 参照）。
- 全PRのユーザーテストは、Claude Desktop の sandbox > chrome を使用して実施する。
  認証機能を持つ画面ではログインを要求する（本デモは認証を持たないため、セッションCookieが
  正しく発行されることの確認をもって代替する）。
- `README.md` と `SPEC/` には未実装のものを書かない。実装が完了した範囲だけを追記する。
- 連絡先を書く必要がある場合は `info@rictaworks.jp` のみを使用し、個人名は書かない。
- コンテンツ（UI文言・説明文）は、ですます調で書く。である調は禁止。

## ドキュメント管理

| ディレクトリ | 用途 | 公開範囲 |
|---|---|---|
| `TASKS/` | タスク管理 | 非公開（.gitignore） |
| `DEBUG/` | バグ報告 | 非公開（.gitignore） |
| `CLIENT/` | クライアント要望等 | 非公開（.gitignore） |
| `WORK/` | 作業報告 | 非公開（.gitignore） |
| `ENV/` | 開発・本番環境情報（`DEVELOPMENT.md` / `PRODUCTION.md`） | 非公開（.gitignore） |
| `SPEC/` | 仕様書・リバースエンジニアリング図 | 公開 |
| `DELETE/` | ゴミ箱。削除の代わりに対象を移動する場所 | 非公開（.gitignore） |

図解（ER図・DFD・シーケンス図・クラス図・状態遷移図・ユースケース図）は mermaid で
記述・管理する（`requirements.md` 内の mermaid ブロックを参照。プレビュー生成には
`@mermaid-js/mermaid-cli` を使用する）。

## コンテンツ制作体制

- 構成・コーディング・レビューはClaude、コンテンツライティングはCodex、コンテンツの
  ファクトチェックはGeminiが担当する（プロンプトやコンテキストに別途指定がある場合を除く）。
- 画像はAI生成する。プロのライティングは `writer` agent（[.claude/agents/writer.md](./.claude/agents/writer.md)）に
  担当させる。
- 現状Codex/Geminiとの自動連携機能は無いため、人間が別ツールで実施した結果をwriter agentが
  レビューする運用とする。

## 開発フロー全体像

```
issue → 実装（設定・コーディング） → セキュリティレビュー → add/commit/push
  → reviewer & pr-checker（ローカルセッションで実施・WORK/reviews/に記録） → merge → …（複数PRの蓄積）…
  → code-review → audit & security-gate → release → report → user test
```

- `code-review` 〜 `release` の内容は **PDF1枚**にまとめて経営向けに保存する（`report`）。
  作成はClaude Desktop側で行う。
- `audit & security-gate` は GitHub Releases 発行をトリガーに **Claude Desktop側**で実施する。
- バージョニング規則・タグ形式・リリース必須添付物は [docs/VERSIONING.md](./docs/VERSIONING.md) を参照。

## CI/CD

- CI（lint・typecheck・test）は `.github/workflows/ci.yml` で必須。
- CD（デプロイ）はこのリポジトリのCIには含めない。**Claude Desktop側で設定・実行する**。
- GitHub Releases発行をトリガーにしたリリース検証・実デプロイ・audit & security-gateの
  ワークフロー整備は別issueで行う（[docs/VERSIONING.md](./docs/VERSIONING.md) 参照）。
