/**
 * 本番／開発の環境判定（CLAUDE.md「環境判定」）。
 * Vite の組み込み環境変数（import.meta.env.PROD）で判定する。本デモは認証を
 * 持たないため、開発環境を「認証済み相当」に分岐する対象機能は存在しないが、
 * 判定ロジック自体は他機能（デバッグ表示の出し分け等）のために用意しておく。
 */
export function isProductionEnvironment(): boolean {
  return import.meta.env.PROD;
}

export function isDevelopmentEnvironment(): boolean {
  return !isProductionEnvironment();
}
