# packages/router-core

ポリシー解決・候補評価・割当決定（純粋ロジック）。`requirements.md` 4章の型定義・定数・
関数A〜Fを実装済みです。外部I/O（DB・HTTP）を一切持たない純粋関数のみで構成しており、
`apps/api`（未実装）から呼び出す想定です。

## 実装状況

| 分類 | ファイル | 内容 |
|---|---|---|
| 型定義 | `src/types.ts` | 4.9・4.10節に対応するドメイン型（次元・ポリシー・タスク・モデル・評価行・割当・変更影響 等） |
| 定数 | `src/constants.ts` | 4.10節の定数一覧（上限値・既定重み・能力下限・コンテキスト余裕係数 等） |
| 理由コード | `src/reasonCodes.ts` | 4.9節の除外理由コード（12件）・警告コード（2件） |
| 文言 | `src/messages.ts` | 理由コードの日本語説明・例外メッセージのテンプレート（ロジックに文字列を直書きしない） |
| 例外 | `src/errors.ts` | 想定外の状態を明示的に扱う専用例外群（フォールバック禁止方針） |
| 関数A | `src/dimensionManager.ts` | `manageDimension`（4.1節：次元・値の追加／改名／削除、表示順変更） |
| 関数B | `src/policyResolver.ts` | `resolvePolicy`（4.2節：有効ポリシー解決） |
| 関数C | `src/candidateEvaluator.ts` | `evaluateCandidates` / `scoreCandidates`（4.3・4.4節：候補評価・採点） |
| 関数D | `src/assignmentDecider.ts` | `selectModel`（4.5節：割当決定） |
| 関数E | `src/recompute.ts` | `recomputeAll`（4.6節：再計算・変更影響） |
| 関数F | `src/pinner.ts` | `pinModel`（4.7節：固定割当の受理・拒否判定） |
| 公開API | `src/index.ts` | 上記すべてを再エクスポートするバレル |

各関数はVitestによる単体テスト（`*.test.ts`）を伴います。`data/model_catalog.json`・
`data/sample_org.json` をフィクスチャとして用いる統合テスト（`src/candidateEvaluator.test.ts`
の一部、`src/sampleOrg.integration.test.ts`）も含みます。

## 設計上の注意

- すべて純粋関数です。DB・HTTPへのアクセス、グローバル状態、乱数、現在時刻への依存を
  持ちません（同じ入力からは常に同じ出力を返します）。
- `pinModel` は4.7節手順1〜2（固定の受理・拒否判定）のみを担います。手順3〜5（保存・
  `selectModel` の再実行・固定違反の検出）は、呼び出し側が `task.pinnedModelId` を更新して
  改めて `selectModel` を実行することで満たします。固定解除も同様に `pinnedModelId` を
  `null` にして `selectModel` を再実行すればよいため、専用の判定関数は持ちません。
- ID（次元ID・値ID・ポリシーID・タスクID）の採番はDB層の責務のため、`manageDimension` は
  次に使うIDを呼び出し側から受け取ります。

## テスト実行

```bash
npm run test
```

ルートの `vitest run --passWithNoTests` が本パッケージのテストも実行します
（パッケージ単独では `packages/router-core` 配下で `npm run test` も可能です）。
