import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from '../test-support/testClient.js';

describe('F10 サンプル読込（requirements.md 5.3節）', () => {
  it('空のセッションにサンプルの次元・ポリシー・タスクを一括投入できる', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/sample/load', { method: 'POST', sessionId, body: {} });
    expect(res.status).toBe(201);
    const body = res.body as { dimensionCount: number; policyCount: number; taskCount: number };
    expect(body.dimensionCount).toBe(3);
    expect(body.policyCount).toBe(6);
    expect(body.taskCount).toBe(12);

    const dimensions = await apiRequest('/api/dimensions', { sessionId });
    expect((dimensions.body as { dimensions: readonly unknown[] }).dimensions).toHaveLength(3);

    const tasks = await apiRequest('/api/tasks', { sessionId });
    expect((tasks.body as { tasks: readonly unknown[] }).tasks).toHaveLength(12);

    const assignments = await apiRequest('/api/assignments', { sessionId });
    expect((assignments.body as { assignments: readonly unknown[] }).assignments).toHaveLength(12);
  });

  it('既にデータがあるセッションへの読込は409を返す', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: '部門' } });

    const res = await apiRequest('/api/sample/load', { method: 'POST', sessionId, body: {} });
    expect(res.status).toBe(409);
  });

  it('サンプル読込後、フランクフルト拠点のタスクはEU限定ポリシーの影響を受ける', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/sample/load', { method: 'POST', sessionId, body: {} });

    const tasks = await apiRequest('/api/tasks', { sessionId });
    const taskList = (tasks.body as { tasks: readonly { id: number; name: string }[] }).tasks;
    const target = taskList.find((t) => t.name === '個人データ関連条項の抽出');
    expect(target).toBeDefined();

    const detail = await apiRequest(`/api/tasks/${target!.id}/assignment`, { sessionId });
    const body = detail.body as { assignment: { adoptedModelId: string | null } };
    // フランクフルト拠点(EU限定)のため、EUリージョンまたはローカルのモデルのみが採用され得る。
    expect(['boreal-eu', 'local-8b', null]).toContain(body.assignment.adoptedModelId);
  });
});
