import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from '../test-support/testClient.js';

const TASK_BODY = {
  name: '固定テスト用タスク',
  taskKind: 'summarize',
  difficulty: 'low',
  sensitivity: 'public',
  inputTokens: 1000,
  outputTokens: 500,
  latencyNeed: 'interactive',
  needsImage: false,
  monthlyRuns: 100,
  position: {},
};

async function createTask(sessionId: string, overrides: Partial<typeof TASK_BODY> = {}): Promise<number> {
  const res = await apiRequest('/api/tasks', { method: 'POST', sessionId, body: { ...TASK_BODY, ...overrides } });
  return (res.body as { task: { id: number } }).task.id;
}

describe('F7 固定割当・解除（requirements.md 4.7節）', () => {
  it('制約を満たすモデルへの固定を受理し、状態がpinnedになる', async () => {
    const sessionId = await issueSession();
    const taskId = await createTask(sessionId);

    const res = await apiRequest(`/api/tasks/${taskId}/pin`, { method: 'POST', sessionId, body: { modelId: 'aster-l' } });
    expect(res.status).toBe(200);
    const body = res.body as { assignment: { status: string; adoptedModelId: string } };
    expect(body.assignment.status).toBe('pinned');
    expect(body.assignment.adoptedModelId).toBe('aster-l');
  });

  it('制約を満たさないモデルへの固定は拒否し、状態を変えない', async () => {
    const sessionId = await issueSession();
    const taskId = await createTask(sessionId, { needsImage: true });

    const res = await apiRequest(`/api/tasks/${taskId}/pin`, {
      method: 'POST',
      sessionId,
      body: { modelId: 'cedar-jp' },
    });
    expect(res.status).toBe(409);
    const body = res.body as { reasonCodes: readonly string[] };
    expect(body.reasonCodes).toContain('MODALITY_UNSUPPORTED');

    const detail = await apiRequest(`/api/tasks/${taskId}/assignment`, { sessionId });
    expect((detail.body as { assignment: { status: string } }).assignment.status).not.toBe('pinned');
  });

  it('固定を解除できる', async () => {
    const sessionId = await issueSession();
    const taskId = await createTask(sessionId);
    await apiRequest(`/api/tasks/${taskId}/pin`, { method: 'POST', sessionId, body: { modelId: 'aster-l' } });

    const res = await apiRequest(`/api/tasks/${taskId}/pin`, { method: 'DELETE', sessionId });
    expect(res.status).toBe(200);
    const body = res.body as { assignment: { status: string } };
    expect(body.assignment.status).toBe('assigned');
  });

  it('固定後にモデルが提供停止になると固定違反になる（9.4節）', async () => {
    const sessionId = await issueSession();
    const taskId = await createTask(sessionId);
    await apiRequest(`/api/tasks/${taskId}/pin`, { method: 'POST', sessionId, body: { modelId: 'aster-l' } });

    await apiRequest('/api/models/aster-l', { method: 'PATCH', sessionId, body: { unavailable: true } });

    const detail = await apiRequest(`/api/tasks/${taskId}/assignment`, { sessionId });
    const body = detail.body as { assignment: { status: string; pinViolationReasonCodes: readonly string[] } };
    expect(body.assignment.status).toBe('pin_violated');
    expect(body.assignment.pinViolationReasonCodes).toContain('MODEL_UNAVAILABLE');
  });
});
