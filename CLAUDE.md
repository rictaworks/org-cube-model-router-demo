# Claude Safety Rules

## 削除系コマンドの禁止（重要）

以下のルールはこのワークスペース内のすべての会話で絶対に守られる：

- Claude はファイルまたはディレクトリを削除するコマンドを一切生成してはならない。
  例：rm, rm -rf, rm *, rmdir, unlink, cache --delete,
      lftp mirror --delete, rsync --delete, git clean -df, find -delete 等。

- 削除が必要な場合でも、Claude は削除コマンドを提案せず、
  「手動で削除してください」といった説明に留めること。

- 削除の推奨・削除操作の自動判断も禁止。

- ssh / lftp / デプロイ系スクリプトを生成する場合でも、
  削除コマンドの生成は禁止。

これらはすべての会話・コード生成に適用される。

## シークレット管理（重要）

- `config/master.key` など機密ファイルを `git add` するコードを生成してはならない
- デプロイスクリプト・セットアップ手順でも同様
- シークレットは必ず環境変数（RAILS_MASTER_KEY 等）で渡すこと
- `.gitignore` への追加を確認する手順を必ずコードに含めること
- 初回コミット前に `git status` でステージング確認を促すこと

## 開発フロー（TDD厳守）

- 実装は必ず `plan → red test → coding → green test` の順で行う。テストが無い実装、
  テストが通っていない実装をコミットしない。
- テストフレームワークは Vitest（`@cloudflare/vitest-pool-workers` で Workers 環境を
  直接テストする）、E2E は Playwright を使用する。
- フロントエンドの確認は `curl`・`wget --mirror`・Playwright で行う。手動でのブラウザ
  確認だけに頼らない。
- アイコンは Font Awesome を使用する。絵文字は使用しない。
- 環境変数は `.env` を参照する（値の直書き禁止）。
- 実装・レビュー時は品質（[.claude/QC10.md](./.claude/QC10.md)）・テスト手法
  （[DOCS/TM.md](./DOCS/TM.md)）・セキュリティ（[.claude/OWASP10.md](./.claude/OWASP10.md)）の
  各チェックリストを都度参照する。
- 動画に関する開発を行う場合は `MM/` ディレクトリのメソッド一式を必ず参照する
  （本デモの現行スコープには動画機能が無いため、該当機能を追加する場合にのみ適用する）。

詳細な運用手順（ブランチ運用・PR・agent体制）は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照。

## コミット前セキュリティレビュー（必須・フック連動）

- コミット前に必ず [.claude/OWASP10.md](./.claude/OWASP10.md)・[.claude/QC10.md](./.claude/QC10.md)
  の観点で `git diff --cached` をレビューする。
- レビュー後、`.claude/.last-security-review` にレビュー済みの staged diff のハッシュを
  記録する。`.claude/settings.json` の `PreToolUse` hook
  （[.claude/hooks/pre-commit-security-guard.sh](./.claude/hooks/pre-commit-security-guard.sh)）が、
  この記録と一致しない `git commit` を自動的にブロックする。
- マージ前には Claude Codeのローカルセッションで `reviewer` / `pr-checker` agent の
  チェックを必須で実施し、判定を `WORK/reviews/pr<PR番号>.md` に記録する（org内の他
  リポジトリと同じ運用。GitHub Actions上の自動実行ではない）。このレビューを省略する
  目的でマージを急がない。

## ブランチ運用

- `main` ブランチでの直接作業を禁止する。
- `src/**`（`apps/*/src/**`・`packages/*/src/**`）を含む変更は必ずPRを作成する。直接pushは禁止。
- `src/**` を含まない変更（`SPEC/`・`TASKS/` 等のドキュメント類）は `main` への直接pushを許可する。

## 実装規約

- 実装は各パッケージの `src/` 配下に置く。開発用スクリプトは `src/` の外に置く。
- 制御構文・条件構文以外のロジックは、必ずクラスまたは関数に分離する。
- グローバル変数は禁止する（セキュリティ上の理由）。
- 文字列（メッセージ・設定値）はコードに直書きせず設定ファイルに分離する。
- フォールバックは禁止する。想定外の状態は例外処理で明示的に扱い、握りつぶさない。
- デバッグトレースができるよう、処理の分岐点・外部境界にログを残す。

## agent体制

規模に応じて、以下の役割の subagent を `.claude/agents/` に用意する：
director, project-manager, designer, debugger, tester, data-scientist, deployer, writer,
service-manager（加えてローカルセッションから呼ぶ reviewer, pr-checker）。各役割の詳細は
[CONTRIBUTING.md](./CONTRIBUTING.md) を参照。

## CI/CD

- CI（lint・typecheck・test）は必須で `.github/workflows/ci.yml` により自動実行する。
- CD（デプロイ）はこのリポジトリのCIには含めない。Claude Desktop側で設定・実行する。
- マージ前チェック（`reviewer`・`pr-checker`）は GitHub Actions ではなく、Claude Code の
  ローカルセッションで実施し、判定を `WORK/reviews/` に記録する（org内の他リポジトリと
  同じ運用）。

## ドキュメント管理

- `TASKS/` タスク管理、`DEBUG/` バグ報告、`CLIENT/` クライアント要望等、`WORK/` 作業報告、
  `ENV/DEVELOPMENT.md` 開発環境、`ENV/PRODUCTION.md` 本番環境、`SPEC/` 仕様書・
  リバースエンジニアリング図（ER図・DFD・シーケンス図・クラス図・状態遷移図・ユースケース図）を
  管理・更新する。図解は mermaid で記述する。
- `TASKS/ DEBUG/ CLIENT/ WORK/ DELETE/ ENV/` は非公開（`.gitignore` 対象）、`SPEC/` は公開。
- `DELETE/` をゴミ箱として使う。**削除コマンドの生成は禁止**（本ファイル冒頭の削除禁止ルール）
  のため、不要になった対象は削除せず `DELETE/` へ移動する運用とする。
- 事前にデザイン指定がある場合は `app-ui/` にモックが配置される。アプリ実装時はこのモックを
  `src/` に再現したうえで実際のロジックに接続する。`app-ui/` はEdit scopeに含めない。
- `README.md` と `SPEC/` には未実装のものを書かない。実装が完了した範囲のみを追記する。

## 連絡先

- 連絡先に個人名は使用しない。メールアドレスは `info@rictaworks.jp` を使用する。

## 文体・言語

- 本事業はB2Bである。コンテンツ（UI文言・README・PR説明文等）は**ですます調**で書く。
  **である調は禁止**。
- 日本語版のみ開発する。多言語対応は行わない。

## 禁止API

- ネイティブの `alert()` / `confirm()` / `prompt()` はプロジェクト全体で使用禁止。
  UIフィードバックはコンポーネント（モーダル・トースト等）で実装する。
  `eslint` の `no-alert` ルールで機械チェックする運用とする（導入は別issue）。

## 環境判定

- 本番／開発の環境を判定するロジックを必ず実装し、分岐可能にする。
- 開発環境はテスト可能にするため、認証済み相当に分岐する。
  （本デモは認証を持たないため直接の適用対象はないが、認証機能を持つ実装では踏襲する）

## 自社共通開発方針（デフォルト）と本プロジェクトでの適用

以下は自社（rictaworks）の開発案件に共通するデフォルト方針である。本プロジェクトは
`requirements.md` のデモ版制約（外部API禁止・認証なし・Cloudflare一本化）を優先するため、
多くの項目が適用除外になる。矛盾する場合は常に `requirements.md` が優先する。

| 項目 | 自社デフォルト | 本プロジェクトでの扱い |
|---|---|---|
| アーキテクチャ | 規模に応じてマイクロサービス／MVC／API Gateway／メッセージングを意識する | 小規模・単一Workersのため非適用（YAGNI） |
| 標準スタック | Next + Rails + PostgreSQL。AI/解析/画像加工はFastAPI、高速並列/リアルタイム通信はGin | `requirements.md` 1.3節によりCloudflare Workers/Pages + D1に一本化、Railway不使用 |
| デプロイ先 | フロントは無料Vercel、バックエンド/管理画面は無料Railway | Cloudflare Pages/Workersのみ |
| 認証 | MVPはGoogleログイン、製品はXログイン（`rictaworks/x-follower-gate` で@rictaworksフォロワーのみ許可）。一般消費者が実際に使える手段でログインし、開発者向け近道を本番UIに露出しない | `requirements.md` 1.4・13.3節により認証を持たないため非適用 |
| AI API | 組み込む場合は gemini・nano banana・veo を使用し、利用可能なモデルから最安値を選定する | 外部API禁止（`requirements.md` 1.3・1.4節）のため非適用 |
| コンテンツ制作 | 画像はAI生成、プロのライティングは `writer` agentが担当。構成・コーディング・レビューはClaude、コンテンツライティングはCodex、ファクトチェックはGemini（指定がある場合を除く） | UI文言中心。体制は `.claude/agents/writer.md` に反映 |
| ライブラリ／OSS／SaaS選定 | メンテナンスコストとセキュリティの観点から安全なものを選び、車輪の再発明を避けてオリジナルコードを少なく保つ | 本プロジェクトにも適用（`DOCS/DP.md` の既存原則の延長） |
| デプロイ実行 | Webはヘッドレスでデプロイを実行し、バックエンドのドメインは隠蔽する。デスクトップ/スマホはビルドから先、ESP32は焼き込みから先はClaude Desktop側で行う | Webのみ。デプロイ実行はClaude Desktop側という既存方針と整合 |
| ドメイン | 原則 `rictaworks.jp` のサブドメイン | `ENV/PRODUCTION.md`（非公開）に反映 |
| 動画成果物 | ナレーション/アニメーション同期はカット単位。voiceは動画のトーンに応じて選定し、選定理由を仕様書に明記する | 動画要素なしのため非適用。動画機能追加時のみ適用（`MM/` 参照ルールと併せて適用） |

バージョニング規則・リリースフロー・ライティング体制の詳細は
[docs/VERSIONING.md](./docs/VERSIONING.md)・[CONTRIBUTING.md](./CONTRIBUTING.md) を参照。