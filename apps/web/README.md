# apps/web

Cloudflare Pages フロントエンドです。requirements.md 2章の機能一覧F1〜F10に対応する
全画面を実装済みです。

- 実装コードは `apps/web/src/` 配下に置きます（テストも同ディレクトリに `*.test.ts`・
  `*.test.tsx` として同居させます。`packages/router-core`・`apps/api` の既存の配置方針に
  合わせています。E2Eテストは `apps/web/src/e2e/*.spec.ts` に置きます）
- `apps/api` を `fetch(..., { credentials: 'include' })` で呼び出すのみで、割当ロジック
  （ポリシー解決・候補評価・採点・割当決定）は一切再実装していません。理由コードの
  日本語説明・定数・ドメイン型は `packages/router-core`（`@org-cube-model-router-demo/router-core`）
  をそのまま再利用しています（DRY）
- `app-ui/` にはデザインモックが未提供のため（`app-ui/README.md`）、`requirements.md` の
  各節（3章 概念モデル、9章 シーケンス図、11章 状態遷移図、13.2節 操作性）に沿って
  画面構成を設計しています

## 技術構成

- ビルド・開発サーバー：[Vite](https://vitejs.dev/) + [React](https://react.dev/) +
  TypeScript を使います。型安全性・実績・エコシステムの広さを理由に選定しました
  （DOCS/DP.mdのYAGNIを踏まえ、状態管理ライブラリ等は追加導入していません。
  次元・ポリシー・モデルカタログの横断的なキャッシュは、標準の React Context API
  （`src/context/AppDataContext.tsx`）のみで賄っています）
- ルーティング：[react-router-dom](https://reactrouter.com/) を使います。SPA内の
  クライアントサイドルーティング（9画面・約10ルート）を手書きの `history` API制御で
  賄うには煩雑なため、実績のある軽量ライブラリを採用しました（`apps/api` が Hono を
  採用した理由と同じ考え方です）
- アイコン：[Font Awesome](https://fontawesome.com/)（`@fortawesome/react-fontawesome` ・
  `@fortawesome/free-solid-svg-icons`）を使います。絵文字は使用しません
  （CLAUDE.md）。npmパッケージとしてバンドルするため、実行時に外部CDNへ通信しません
  （requirements.md 13.4節：外部サービスへの通信を一切持たない）
- UIフィードバック：ネイティブの `alert()`/`confirm()`/`prompt()` は使用禁止のため
  （CLAUDE.md）、モーダル（`src/components/Modal.tsx`）・確認ダイアログ
  （`src/components/ConfirmDialog.tsx`）・トースト（`src/context/ToastContext.tsx`）を
  自作しています
- テスト：単体は [Vitest](https://vitest.dev/)（jsdom環境）+
  [Testing Library](https://testing-library.com/)（`@testing-library/react` ・
  `@testing-library/user-event`）、E2Eは [Playwright](https://playwright.dev/) を使います

## 画面一覧（ルーティング）

| パス | 画面名 | 対応するF番号 | 主なAPI呼び出し |
|---|---|---|---|
| `/` | ホーム（サンプル読込導線を含む） | F10 | `POST /api/sample/load` |
| `/dimensions` | 次元管理 | F1 | `GET/POST/PATCH/DELETE /api/dimensions`・`GET /api/dimensions/:id/impact`・値のCRUD |
| `/policies` | ポリシー管理 | F2 | `GET/POST/PATCH/DELETE /api/policies` |
| `/tasks` | タスク管理 | F3 | `GET/POST/PATCH/DELETE /api/tasks` |
| `/models` | モデルカタログ | F4 | `GET /api/models`・`PATCH /api/models/:modelId` |
| `/assignments` | 割当結果一覧 | F5（F7の強調表示を含む） | `GET /api/assignments` |
| `/assignments/:taskId` | 割当・根拠（固定割当を含む） | F6・F7 | `GET /api/tasks/:id/assignment`・`POST/DELETE /api/tasks/:id/pin` |
| `/change-impacts` | 変更影響 | F8 | `GET /api/change-impacts` |
| `/org-view` | 組織ビュー | F9 | `GET /api/org-view` |

F5（割当結果一覧）・F6（根拠表示）・F7（固定割当）は、`apps/api` 側でも密接に関連する
エンドポイント群（`GET /api/assignments`・`GET /api/tasks/:id/assignment`・
`POST|DELETE /api/tasks/:id/pin`）としてまとまっているため、フロントエンドでも
「一覧画面（強調表示・遷移導線）→詳細画面（得点内訳・除外理由・固定操作）」という
1つの導線にまとめています。

## 開発サーバーの起動

`apps/api`（`wrangler dev`）と `apps/web`（Vite dev server）を両方起動します。

```bash
# 1. apps/api 側：D1ローカルDBへスキーマを適用してから起動（初回のみ・または schema.sql 変更時）
cd apps/api
npx wrangler d1 execute org-cube-model-router-demo --local --file=../../db/schema.sql
npm run dev   # 既定ポート: 8787

# 2. apps/web 側（別ターミナル）
cd apps/web
npm run dev   # 既定ポート: 5173
```

`apps/web/vite.config.ts` のプロキシ設定により、ブラウザから見た `/api` 配下のリクエストは
同一オリジンで `http://localhost:8787`（`wrangler dev`）へ転送されます。これにより
セッションCookie（`credentials: 'include'`）がブラウザ・開発サーバー間で問題なく
往復します。転送先は環境変数 `VITE_API_PROXY_TARGET` で変更できます（既定値は
`http://localhost:8787`）。

本番（Cloudflare Pages）での `/api` 配下のAPIサーバーへのルーティング設定は、
デプロイ実行を担うClaude Desktop側で行う想定です（CLAUDE.md：CDはこのリポジトリの
責務外）。

## テストの実行

```bash
# 単体テスト（Vitest・jsdom環境）
npm run test --workspace apps/web
# またはリポジトリルートから（packages/router-core・apps/api と合わせて実行）
npm run test

# E2Eテスト（Playwright）。apps/api・apps/web の開発サーバーをルートの
# playwright.config.ts の webServer 設定が自動起動する（D1スキーマの適用も含む）
npm run test:e2e
```

E2Eテストは `apps/web/src/e2e/` に置いています。

| ファイル | 検証するフロー |
|---|---|
| `taskAssignment.spec.ts` | サンプル読込→タスク登録→割当・根拠表示（requirements.md 9.1節） |
| `policyChangeImpact.spec.ts` | サンプル読込→ポリシー変更（重み変更）→変更影響一覧表示（requirements.md 9.2節） |

## 設計上の注意点

- **文言の集約**：UI文言・フィールドラベル・エラーメッセージ・列挙値の日本語表示は
  すべて `src/config/messages.ts` に集約しています（CLAUDE.md「文字列はコードに
  直書きせず設定ファイルに分離する」）。理由コードの日本語説明は
  `packages/router-core` の `REASON_CODE_MESSAGES` を再利用し、重複定義していません
- **個人情報の注意喚起**：タスク名・次元の値の入力欄には
  `src/components/PrivacyNotice.tsx` を配置し、個人名・連絡先を入力しないよう
  注意書きを表示しています（requirements.md 1.4・13.2節）
- **ハニーポット**：`src/api/client.ts` が、書き込み系リクエスト（POST/PUT/PATCH）の
  ボディへ常に `contact_note`（空文字）を付与します（apps/api の
  `HONEYPOT_FIELD_NAME` と一致）。加えて主要な入力フォームには
  `src/components/HoneypotField.tsx`（不可視項目）を配置しています
  （requirements.md 13.4節）
- **除外理由の「寄与ポリシー」表示（requirements.md 13.1節）**：`GET
  /api/tasks/:id/assignment` は、タスクに適用されたポリシーID一覧
  （`appliedPolicyIds`）は返しますが、制約項目ごとに実際に「狭めた」ポリシーID
  （`packages/router-core` の `ConstraintContributors`）までは永続化・公開して
  いません（`apps/api/src` は参照専用のため変更していません）。そのため
  `src/lib/reasonCodeContributors.ts` では、適用ポリシーのうち当該理由コードに
  関係する制約項目（許可リージョン・許可プロバイダ・禁止モデル・ローカル必須・
  コスト上限）に値を設定しているものを「寄与ポリシー（候補）」として画面に提示し、
  一意の特定ではない候補である旨を明記しています
- **未割当・固定違反の強調表示と遷移導線（requirements.md 13.2節）**：割当結果一覧
  （`/assignments`）で未割当・固定違反のタスクを強調表示し、理由コードから
  ポリシー管理画面（`/policies?focus=<id>`）・タスク管理画面
  （`/tasks?focus=<id>`）へ遷移できます
- **組織ビューの自動切り替え（requirements.md 13.2節）**：`/org-view` は、次元が
  0個のときは全体集計（`mode: 'none'`）、1個のときは1次元の一覧（`mode: 'single'`）、
  2個以上のときは選択した2次元のクロス集計（`mode: 'cross'`）を、`apps/api` の
  `GET /api/org-view` の応答モードにそのまま従って切り替えます
- **セッションCookieの確立**：ブラウザに未確立の状態で複数のAPIリクエストを並行
  送信すると、各リクエストが個別に新規セッションを発行してしまい競合します
  （requirements.md 13.3節）。`AppDataProvider`（`src/context/AppDataContext.tsx`）は
  アプリ起動時、最初の1件（次元取得）を先に完了させてセッションCookieを確定させて
  から、残りのリソースを並行取得します。加えて、同一リソースへの取得要求が並行して
  発生した場合に、先に開始したが後から解決した要求（stale response）が新しい状態を
  上書きしないよう、要求ごとに連番を振って最新の要求のみを状態へ反映しています
