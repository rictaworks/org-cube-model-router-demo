/**
 * sessions テーブルの読み書きと、日次リセット（requirements.md 4.8節）の実データ削除。
 *
 * 日次リセットの削除対象は「model_catalog を除く全テーブル」。外部キー制約
 * （db/schema.sql：ON DELETE指定なし＝NO ACTION）を満たすため、子テーブルから
 * 親テーブルの順に削除する。
 */

interface SessionRow {
  readonly session_id: string;
  readonly created_at: string;
  readonly last_reset_at: string;
}

export interface SessionState {
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly lastResetAt: Date;
}

export async function findSession(db: D1Database, sessionId: string): Promise<SessionState | null> {
  const row = await db
    .prepare('SELECT session_id, created_at, last_reset_at FROM sessions WHERE session_id = ?1')
    .bind(sessionId)
    .first<SessionRow>();
  if (row === null) {
    return null;
  }
  return { sessionId: row.session_id, createdAt: new Date(row.created_at), lastResetAt: new Date(row.last_reset_at) };
}

export async function createSession(db: D1Database, sessionId: string, now: Date): Promise<void> {
  const iso = now.toISOString();
  await db
    .prepare('INSERT INTO sessions (session_id, created_at, last_reset_at) VALUES (?1, ?2, ?2)')
    .bind(sessionId, iso)
    .run();
}

export async function updateLastResetAt(db: D1Database, sessionId: string, now: Date): Promise<void> {
  await db
    .prepare('UPDATE sessions SET last_reset_at = ?1 WHERE session_id = ?2')
    .bind(now.toISOString(), sessionId)
    .run();
}

/**
 * セッションの全データ（model_catalog を除く）を削除する（requirements.md 4.8節）。
 * 子テーブルから親テーブルの順で削除する。
 */
export async function deleteAllSessionData(db: D1Database, sessionId: string): Promise<void> {
  const statements = [
    db
      .prepare(
        'DELETE FROM assignment_candidates WHERE task_id IN (SELECT id FROM tasks WHERE session_id = ?1)',
      )
      .bind(sessionId),
    db.prepare('DELETE FROM change_impacts WHERE session_id = ?1').bind(sessionId),
    db.prepare('DELETE FROM assignments WHERE session_id = ?1').bind(sessionId),
    db
      .prepare('DELETE FROM task_positions WHERE task_id IN (SELECT id FROM tasks WHERE session_id = ?1)')
      .bind(sessionId),
    db.prepare('DELETE FROM tasks WHERE session_id = ?1').bind(sessionId),
    db
      .prepare(
        'DELETE FROM policy_selectors WHERE policy_id IN (SELECT id FROM policies WHERE session_id = ?1)',
      )
      .bind(sessionId),
    db.prepare('DELETE FROM policies WHERE session_id = ?1').bind(sessionId),
    db.prepare('DELETE FROM dimension_values WHERE session_id = ?1').bind(sessionId),
    db.prepare('DELETE FROM dimensions WHERE session_id = ?1').bind(sessionId),
    db.prepare('DELETE FROM model_overrides WHERE session_id = ?1').bind(sessionId),
  ];
  await db.batch(statements);
}
