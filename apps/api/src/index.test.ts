import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from './test-support/testClient.js';

describe('セッション発行（requirements.md 1.4・13.3節）', () => {
  it('初回アクセスでセッションIDが発行されCookieに設定される', async () => {
    const res = await apiRequest('/api/dimensions');
    expect(res.status).toBe(200);
    expect(res.sessionId).toBeDefined();
    expect(res.body).toEqual({ dimensions: [] });
  });

  it('同じセッションIDのCookieを送ると同じデータが見える', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    const res = await apiRequest('/api/dimensions', { sessionId });
    expect(res.status).toBe(200);
    const body = res.body as { dimensions: readonly { name: string }[] };
    expect(body.dimensions).toHaveLength(1);
    expect(body.dimensions[0]?.name).toBe('部門');
  });
});
