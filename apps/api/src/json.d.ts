/**
 * ルートの tsconfig.base.json に resolveJsonModule を追加せずに（Edit scope外のため）、
 * マスタデータ（data/model_catalog.json・data/sample_org.json）をESMの相対importで
 * 読み込めるようにするアンビエント宣言。packages/router-core/src/json.d.ts と同じ方針。
 */
declare module '*.json' {
  const value: unknown;
  export default value;
}
