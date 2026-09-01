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
- マージ前には `.github/workflows/pr-checks.yml` により `reviewer` / `pr-checker` agent の
  チェックが必須で走る。ローカルのレビューを省略する目的でこのチェックを回避しない。

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
service-manager（加えてフック・CIから呼ぶ reviewer, pr-checker）。各役割の詳細は
[CONTRIBUTING.md](./CONTRIBUTING.md) を参照。

## CI/CD

- CI（lint・typecheck・test）は必須で `.github/workflows/ci.yml` により自動実行する。
- CD（デプロイ）はこのリポジトリのCIには含めない。Claude Desktop側で設定・実行する。
- マージ前チェック（`reviewer`・`pr-checker`）は `.github/workflows/pr-checks.yml` の
  必須ステータスチェックとして実行する。

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