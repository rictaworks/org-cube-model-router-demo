/**
 * セッションの発行・復元と日次リセットの起動（requirements.md 1.4・4.8・13.3節）。
 * Cookieの読み書き自体はHono側（middleware.ts）で行い、ここではD1に対する
 * 判定・副作用のみを担う。
 */
import { shouldResetSession } from './dailyReset.js';
import { createSession, deleteAllSessionData, findSession, updateLastResetAt } from './repositories/sessionRepository.js';

export interface SessionBootstrapResult {
  readonly sessionId: string;
  readonly isNew: boolean;
  readonly wasReset: boolean;
}

/**
 * Cookieから受け取ったセッションIDを検証・復元し、必要なら新規発行・日次リセットを行う。
 */
export async function bootstrapSession(
  db: D1Database,
  cookieSessionId: string | undefined,
  now: Date,
): Promise<SessionBootstrapResult> {
  if (cookieSessionId === undefined) {
    const sessionId = crypto.randomUUID();
    await createSession(db, sessionId, now);
    console.log(`[session] issued new session session_id=${sessionId}`);
    return { sessionId, isNew: true, wasReset: false };
  }

  const existing = await findSession(db, cookieSessionId);
  if (existing === null) {
    // Cookieは送られてきたがsessionsテーブルに存在しない（初回発行前に破棄された等）。
    // クライアントが指定した値をそのまま新規セッションIDとして採用すると、
    // セッション固定攻撃（session fixation）を許してしまう（requirements.md 13.3節：
    // セッションIDの秘匿性のみがアクセス境界）。新規IDは必ずサーバー側で
    // 暗号論的に安全な方法で生成する。クライアントのCookie値は既存セッションとの
    // 一致確認にのみ用い、新規発行時には破棄する。
    const sessionId = crypto.randomUUID();
    await createSession(db, sessionId, now);
    console.log(`[session] issued new session session_id=${sessionId} (client-supplied session_id was unknown)`);
    return { sessionId, isNew: true, wasReset: false };
  }

  if (shouldResetSession(existing.lastResetAt, now)) {
    await deleteAllSessionData(db, cookieSessionId);
    await updateLastResetAt(db, cookieSessionId, now);
    console.log(`[session] daily reset executed session_id=${cookieSessionId}`);
    return { sessionId: cookieSessionId, isNew: false, wasReset: true };
  }

  return { sessionId: cookieSessionId, isNew: false, wasReset: false };
}
