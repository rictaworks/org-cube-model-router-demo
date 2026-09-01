import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from '../test-support/testClient.js';

interface DimensionView {
  readonly id: number;
  readonly name: string;
  readonly displayOrder: number;
  readonly values: readonly { id: number; name: string }[];
}

describe('F1 次元管理（requirements.md 4.1節）', () => {
  it('次元を追加できる', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    expect(res.status).toBe(201);
    const body = res.body as { dimension: DimensionView };
    expect(body.dimension.name).toBe('部門');
    expect(body.dimension.values).toEqual([]);
  });

  it('空文字の次元名は拒否する', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '' } });
    expect(res.status).toBe(400);
  });

  it('同名の次元は拒否する（一意制約：4.1節手順1）', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    const res = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    expect(res.status).toBe(409);
  });

  it('次元を改名できる', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    const dimensionId = (created.body as { dimension: DimensionView }).dimension.id;

    const res = await apiRequest(`/api/dimensions/${dimensionId}`, {
      method: 'PATCH',
      sessionId,
      body: { name: '部署' },
    });
    expect(res.status).toBe(200);

    const list = await apiRequest('/api/dimensions', { sessionId });
    const body = list.body as { dimensions: readonly DimensionView[] };
    expect(body.dimensions[0]?.name).toBe('部署');
  });

  it('存在しない次元の改名は404を返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/dimensions/999', { method: 'PATCH', sessionId, body: { name: 'x' } });
    expect(res.status).toBe(404);
  });

  it('値を追加・改名できる', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    const dimensionId = (created.body as { dimension: DimensionView }).dimension.id;

    const addRes = await apiRequest(`/api/dimensions/${dimensionId}/values`, {
      method: 'POST',
      sessionId,
      body: { name: '営業' },
    });
    expect(addRes.status).toBe(201);
    const valueId = (addRes.body as { value: { id: number } }).value.id;

    const renameRes = await apiRequest(`/api/dimensions/${dimensionId}/values/${valueId}`, {
      method: 'PATCH',
      sessionId,
      body: { name: '営業部' },
    });
    expect(renameRes.status).toBe(200);

    const list = await apiRequest('/api/dimensions', { sessionId });
    const body = list.body as { dimensions: readonly DimensionView[] };
    expect(body.dimensions[0]?.values[0]?.name).toBe('営業部');
  });

  it('タスク・ポリシーが参照する値の削除は拒否する（4.1節手順5）', async () => {
    const sessionId = await issueSession();
    const dim = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });
    const dimensionId = (dim.body as { dimension: DimensionView }).dimension.id;
    const value = await apiRequest(`/api/dimensions/${dimensionId}/values`, {
      method: 'POST',
      sessionId,
      body: { name: '営業' },
    });
    const valueId = (value.body as { value: { id: number } }).value.id;

    await apiRequest('/api/tasks', {
      method: 'POST',
      sessionId,
      body: {
        name: 'タスクA',
        taskKind: 'summarize',
        difficulty: 'low',
        sensitivity: 'public',
        inputTokens: 100,
        outputTokens: 100,
        latencyNeed: 'interactive',
        needsImage: false,
        monthlyRuns: 0,
        position: { [dimensionId]: valueId },
      },
    });

    const res = await apiRequest(`/api/dimensions/${dimensionId}/values/${valueId}`, {
      method: 'DELETE',
      sessionId,
    });
    expect(res.status).toBe(409);
  });

  it('次元削除の影響プレビューを取得できる（9.3節）', async () => {
    const sessionId = await issueSession();
    const dim = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '拠点' } });
    const dimensionId = (dim.body as { dimension: DimensionView }).dimension.id;
    const value = await apiRequest(`/api/dimensions/${dimensionId}/values`, {
      method: 'POST',
      sessionId,
      body: { name: 'フランクフルト' },
    });
    const valueId = (value.body as { value: { id: number } }).value.id;

    await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: { name: 'EU限定', selector: { [dimensionId]: valueId }, allowedRegions: ['EU'] },
    });

    const impact = await apiRequest(`/api/dimensions/${dimensionId}/impact`, { sessionId });
    expect(impact.status).toBe(200);
    const impactBody = impact.body as { affectedTaskCount: number; affectedPolicyIds: readonly number[] };
    expect(impactBody.affectedPolicyIds).toHaveLength(1);
  });

  it('次元を削除するとその次元を参照するポリシーが無効化され、タスクの座標が失われる', async () => {
    const sessionId = await issueSession();
    const dim = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '拠点' } });
    const dimensionId = (dim.body as { dimension: DimensionView }).dimension.id;
    const value = await apiRequest(`/api/dimensions/${dimensionId}/values`, {
      method: 'POST',
      sessionId,
      body: { name: 'フランクフルト' },
    });
    const valueId = (value.body as { value: { id: number } }).value.id;

    await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: { name: 'EU限定', selector: { [dimensionId]: valueId }, allowedRegions: ['EU'] },
    });
    await apiRequest('/api/tasks', {
      method: 'POST',
      sessionId,
      body: {
        name: 'タスクA',
        taskKind: 'summarize',
        difficulty: 'low',
        sensitivity: 'public',
        inputTokens: 100,
        outputTokens: 100,
        latencyNeed: 'interactive',
        needsImage: false,
        monthlyRuns: 0,
        position: { [dimensionId]: valueId },
      },
    });

    const del = await apiRequest(`/api/dimensions/${dimensionId}`, { method: 'DELETE', sessionId });
    expect(del.status).toBe(200);

    const dimensionsAfter = await apiRequest('/api/dimensions', { sessionId });
    expect((dimensionsAfter.body as { dimensions: readonly DimensionView[] }).dimensions).toHaveLength(0);

    const policiesAfter = await apiRequest('/api/policies', { sessionId });
    const policyList = (policiesAfter.body as { policies: readonly { status: string }[] }).policies;
    expect(policyList[0]?.status).toBe('disabled');

    const tasksAfter = await apiRequest('/api/tasks', { sessionId });
    const taskList = (tasksAfter.body as { tasks: readonly { position: Record<string, number> }[] }).tasks;
    expect(taskList[0]?.position).toEqual({});
  });
});
