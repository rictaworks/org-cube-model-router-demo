/**
 * ルートの tsconfig.base.json に resolveJsonModule を追加せずに（Edit scope外のため）、
 * テストフィクスチャ（data/model_catalog.json・data/sample_org.json）をESMの
 * 相対importで読み込めるようにするアンビエント宣言。
 */
declare module '*.json' {
  const value: unknown;
  export default value;
}
