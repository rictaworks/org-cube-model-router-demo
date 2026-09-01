import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from '../test-support/testClient.js';

const BASE_TASK = {
  name: 'org-viewタスク',
  taskKind: 'summarize',
  difficulty: 'low',
  sensitivity: 'public',
  inputTokens: 1000,
  outputTokens: 500,
  latencyNeed: 'interactive',
  needsImage: false,
  monthlyRuns: 100,
};

describe('F9 組織ビュー（requirements.md 13.2節）', () => {
  it('次元が0個の場合は単一集計になる', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/tasks', { method: 'POST', sessionId, body: { ...BASE_TASK, position: {} } });

    const res = await apiRequest('/api/org-view', { sessionId });
    expect(res.status).toBe(200);
    const body = res.body as { mode: string; overall: { taskCount: number } };
    expect(body.mode).toBe('none');
    expect(body.overall.taskCount).toBe(1);
  });

  it('次元が1個の場合は1次元の一覧表示になる（13.2節）', async () => {
    const sessionId = await issueSession();
    const dim = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    const dimensionId = (dim.body as { dimension: { id: number } }).dimension.id;
    const value = await apiRequest(`/api/dimensions/${dimensionId}/values`, {
      method: 'POST',
      sessionId,
      body: { name: '営業' },
    });
    const valueId = (value.body as { value: { id: number } }).value.id;

    await apiRequest('/api/tasks', {
      method: 'POST',
      sessionId,
      body: { ...BASE_TASK, position: { [dimensionId]: valueId } },
    });

    const res = await apiRequest('/api/org-view', { sessionId });
    const body = res.body as { mode: string; table: readonly { rowValueId: number | null; cells: readonly { taskCount: number }[] }[] };
    expect(body.mode).toBe('single');
    const row = body.table.find((r) => r.rowValueId === valueId);
    expect(row?.cells[0]?.taskCount).toBe(1);
  });

  it('2次元のクロス集計で各セルのタスク数・採用モデルの内訳・未割当数を表示できる', async () => {
    const sessionId = await issueSession();
    const dimA = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    const dimAId = (dimA.body as { dimension: { id: number } }).dimension.id;
    const valA = await apiRequest(`/api/dimensions/${dimAId}/values`, { method: 'POST', sessionId, body: { name: '営業' } });
    const valAId = (valA.body as { value: { id: number } }).value.id;

    const dimB = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '拠点' } });
    const dimBId = (dimB.body as { dimension: { id: number } }).dimension.id;
    const valB = await apiRequest(`/api/dimensions/${dimBId}/values`, { method: 'POST', sessionId, body: { name: '東京' } });
    const valBId = (valB.body as { value: { id: number } }).value.id;

    await apiRequest('/api/tasks', {
      method: 'POST',
      sessionId,
      body: { ...BASE_TASK, position: { [dimAId]: valAId, [dimBId]: valBId } },
    });

    const res = await apiRequest(`/api/org-view?rowDimensionId=${dimAId}&colDimensionId=${dimBId}`, { sessionId });
    expect(res.status).toBe(200);
    const body = res.body as {
      mode: string;
      table: readonly { rowValueId: number | null; cells: readonly { colValueId: number | null; taskCount: number; byModel: Record<string, number> }[] }[];
    };
    expect(body.mode).toBe('cross');
    const row = body.table.find((r) => r.rowValueId === valAId);
    const cell = row?.cells.find((c) => c.colValueId === valBId);
    expect(cell?.taskCount).toBe(1);
    expect(Object.values(cell?.byModel ?? {}).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('存在しない次元IDを指定すると400を返す', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    const res = await apiRequest('/api/org-view?rowDimensionId=999', { sessionId });
    expect(res.status).toBe(400);
  });
});
