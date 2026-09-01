# SPEC

仕様書・リバースエンジニアリング図の管理場所（公開）。

## 現状の運用

- 詳細設計は [../requirements.md](../requirements.md) を正とする。ER図・DFD・
  シーケンス図・クラス図・状態遷移図・ユースケース図は、いずれも同ファイル内の
  mermaid コードブロックとして管理されている（7〜12章）。
- 図解のプレビュー生成には `@mermaid-js/mermaid-cli`（root `package.json` の
  devDependencies）を使用する。
- 実装が進み仕様が安定した範囲から、`requirements.md` の内容整理版として
  `docs/spec.md`（`requirements.md` 13.5節のリポジトリ構成）へ正式移行する。
  移行までは `requirements.md` が正。

## 運用ルール

- **未実装のものをここに書かない**（`CLAUDE.md`）。実装が完了した範囲の仕様・図のみを
  この配下に追加・更新する。
- 実装によって `requirements.md` の記述と実装が乖離した場合は、`requirements.md` 側を
  更新する（実装が仕様に合わせるのが原則。仕様変更が必要な場合は director agent の判断を経る）。
