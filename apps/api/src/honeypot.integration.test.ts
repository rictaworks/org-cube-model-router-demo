import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from './test-support/testClient.js';

describe('ハニーポット（requirements.md 13.4節）: HTTP境界での破棄', () => {
  it('ハニーポット項目に値が入っているPOSTリクエストは400で破棄される', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/dimensions', {
      method: 'POST',
      sessionId,
      body: { name: '部門', contact_note: 'Botが埋めた値' },
    });
    expect(res.status).toBe(400);

    const list = await apiRequest('/api/dimensions', { sessionId });
    // 破棄されているため、次元は作成されていない。
    expect((list.body as { dimensions: readonly unknown[] }).dimensions).toHaveLength(0);
  });

  it('ハニーポット項目が空のPOSTリクエストは通常どおり処理される', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/dimensions', {
      method: 'POST',
      sessionId,
      body: { name: '部門', contact_note: '' },
    });
    expect(res.status).toBe(201);
  });

  it('不正なJSON本文は400を返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/dimensions', {
      method: 'POST',
      sessionId,
      body: '{ invalid json',
    });
    expect(res.status).toBe(400);
  });
});
