import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from './test-support/testClient.js';

describe('セッション分離（requirements.md 13.3節）', () => {
  it('異なるセッションIDでは互いのデータが見えない', async () => {
    const sessionA = await issueSession();
    const sessionB = await issueSession();

    await apiRequest('/api/dimensions', { method: 'POST', sessionId: sessionA, body: { name: '部門A' } });

    const listA = await apiRequest('/api/dimensions', { sessionId: sessionA });
    const listB = await apiRequest('/api/dimensions', { sessionId: sessionB });

    expect((listA.body as { dimensions: readonly unknown[] }).dimensions).toHaveLength(1);
    expect((listB.body as { dimensions: readonly unknown[] }).dimensions).toHaveLength(0);
  });

  it('Cookieが無いリクエストのたびに新しいセッションIDが発行される', async () => {
    const res1 = await apiRequest('/api/dimensions');
    const res2 = await apiRequest('/api/dimensions');
    expect(res1.sessionId).toBeDefined();
    expect(res2.sessionId).toBeDefined();
    expect(res1.sessionId).not.toBe(res2.sessionId);
  });

  it('セッション固定（session fixation）: 未知のsession_idをクライアントが指定しても、そのIDでは発行されない', async () => {
    // requirements.md 13.3節：認証を持たないため、セッションIDの秘匿性のみがアクセス境界。
    // クライアントが指定した値をそのまま新規セッションIDとして採用すると、攻撃者が
    // 事前に用意したIDを被害者に踏ませて後から乗っ取れてしまう（session fixation）。
    const attackerChosenId = 'attacker-chosen-session-id';
    const res = await apiRequest('/api/dimensions', { sessionId: attackerChosenId });

    expect(res.sessionId).toBeDefined();
    expect(res.sessionId).not.toBe(attackerChosenId);
  });
});

describe('日次リセット（requirements.md 4.8節：JST 03:00基準）', () => {
  it('前回リセット日時が直近のJST 03:00より前であれば、次のリクエストでデータが全削除される', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });

    const beforeReset = await apiRequest('/api/dimensions', { sessionId });
    expect((beforeReset.body as { dimensions: readonly unknown[] }).dimensions).toHaveLength(1);

    // 前回リセット日時を過去（2000-01-01T00:00:00Z）に書き換え、次回アクセスで
    // 日次リセットが発火する状態を作る。
    await env.DB.prepare('UPDATE sessions SET last_reset_at = ?1 WHERE session_id = ?2')
      .bind('2000-01-01T00:00:00.000Z', sessionId)
      .run();

    const afterReset = await apiRequest('/api/dimensions', { sessionId });
    expect((afterReset.body as { dimensions: readonly unknown[] }).dimensions).toHaveLength(0);
  });

  it('モデルカタログは日次リセットの対象外である（4.8節）', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/models/aster-l', { method: 'PATCH', sessionId, body: { unavailable: true } });

    await env.DB.prepare('UPDATE sessions SET last_reset_at = ?1 WHERE session_id = ?2')
      .bind('2000-01-01T00:00:00.000Z', sessionId)
      .run();

    const res = await apiRequest('/api/models', { sessionId });
    const body = res.body as { models: readonly { modelId: string }[] };
    // カタログ本体はリセット対象外のため、6モデルすべてが引き続き閲覧できる。
    expect(body.models).toHaveLength(6);
  });
});
