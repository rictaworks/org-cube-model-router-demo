/**
 * apps/api 全体で用いるアプリケーション型定義。
 *
 * ロジック本体の型（Dimension・Policy・Task・Model等）は packages/router-core を
 * そのまま利用する。ここではHTTP層・D1バインディング・Honoコンテキストの型のみを持つ。
 */

/** Workers のバインディング一覧（D1のみ：requirements.md 13.4節）。 */
export interface Env {
  readonly DB: D1Database;
}

/** リクエストスコープでHonoコンテキストに保持する値。 */
export interface Variables {
  /** Cookieで発行・保持するセッションID（requirements.md 13.3節）。 */
  readonly sessionId: string;
  /** ハニーポット判定のためにミドルウェアで読み取り済みのJSONボディ（あれば）。 */
  readonly parsedBody?: unknown;
}

export interface AppEnv {
  readonly Bindings: Env;
  readonly Variables: Variables;
}
