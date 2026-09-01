import { describe, expect, it } from 'vitest';
import { API_MESSAGES } from '../config.js';
import { apiRequest, issueSession } from '../test-support/testClient.js';

describe('F4 モデルカタログ閲覧・提供停止切替（requirements.md 3.4節）', () => {
  it('モデルカタログを閲覧できる（5.1節：6モデル）', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/models', { sessionId });
    expect(res.status).toBe(200);
    const body = res.body as { models: readonly { modelId: string; unavailable: boolean }[] };
    expect(body.models).toHaveLength(6);
    expect(body.models.every((m) => m.unavailable === false)).toBe(true);
  });

  it('セッション内でモデルを提供停止に切り替えられる', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/models/aster-l', {
      method: 'PATCH',
      sessionId,
      body: { unavailable: true },
    });
    expect(res.status).toBe(200);

    const list = await apiRequest('/api/models', { sessionId });
    const body = list.body as { models: readonly { modelId: string; unavailable: boolean }[] };
    expect(body.models.find((m) => m.modelId === 'aster-l')?.unavailable).toBe(true);
  });

  it('存在しないモデルIDの切り替えは404を返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/models/not-exist', {
      method: 'PATCH',
      sessionId,
      body: { unavailable: true },
    });
    expect(res.status).toBe(404);
  });

  it('unavailable が真偽値でない場合、名称用ではなくフィールドに即したエラーメッセージを返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/models/aster-l', {
      method: 'PATCH',
      sessionId,
      body: { unavailable: '真偽値ではない' },
    });
    expect(res.status).toBe(400);
    const body = res.body as { message: string };
    expect(body.message).toBe(API_MESSAGES.invalidUnavailableFlag);
    expect(body.message).not.toBe(API_MESSAGES.invalidName);
  });

  it('他セッションの提供停止設定は互いに影響しない（13.3節）', async () => {
    const sessionA = await issueSession();
    const sessionB = await issueSession();

    await apiRequest('/api/models/aster-l', { method: 'PATCH', sessionId: sessionA, body: { unavailable: true } });

    const listB = await apiRequest('/api/models', { sessionId: sessionB });
    const bodyB = listB.body as { models: readonly { modelId: string; unavailable: boolean }[] };
    expect(bodyB.models.find((m) => m.modelId === 'aster-l')?.unavailable).toBe(false);
  });
});
