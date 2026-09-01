import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from '../test-support/testClient.js';

const TASK_BODY = {
  name: '要約タスク',
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

describe('F5 割当計算の結果一覧（requirements.md 4.5節）', () => {
  it('タスクの割当一覧を取得できる', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/tasks', { method: 'POST', sessionId, body: TASK_BODY });
    const res = await apiRequest('/api/assignments', { sessionId });
    expect(res.status).toBe(200);
    const body = res.body as { assignments: readonly { status: string; adoptedModelId: string | null }[] };
    expect(body.assignments).toHaveLength(1);
    expect(body.assignments[0]?.status).toBe('assigned');
    expect(body.assignments[0]?.adoptedModelId).not.toBeNull();
  });
});

describe('F6 根拠表示（requirements.md 4.3・4.4節）', () => {
  it('得点内訳・次点候補・除外理由・適用ポリシーを取得できる', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/tasks', { method: 'POST', sessionId, body: TASK_BODY });
    const taskId = (created.body as { task: { id: number } }).task.id;

    const res = await apiRequest(`/api/tasks/${taskId}/assignment`, { sessionId });
    expect(res.status).toBe(200);
    const body = res.body as {
      assignment: {
        status: string;
        adoptedModelId: string;
        candidates: readonly { modelId: string; passed: boolean; reasonCodes: readonly string[] }[];
        runnersUp: readonly { modelId: string; rank: number }[];
      };
    };
    expect(body.assignment.status).toBe('assigned');
    expect(body.assignment.candidates).toHaveLength(6);
    expect(body.assignment.candidates.every((c) => c.passed)).toBe(true);
  });

  it('画像入力を要するがモデルが非対応の場合、除外理由MODALITY_UNSUPPORTEDが記録される', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/tasks', {
      method: 'POST',
      sessionId,
      body: { ...TASK_BODY, needsImage: true },
    });
    const taskId = (created.body as { task: { id: number } }).task.id;

    const res = await apiRequest(`/api/tasks/${taskId}/assignment`, { sessionId });
    const body = res.body as {
      assignment: { candidates: readonly { modelId: string; passed: boolean; reasonCodes: readonly string[] }[] };
    };
    const cedar = body.assignment.candidates.find((c) => c.modelId === 'cedar-jp');
    expect(cedar?.passed).toBe(false);
    expect(cedar?.reasonCodes).toContain('MODALITY_UNSUPPORTED');
  });

  it('存在しないタスクの根拠取得は404を返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/tasks/999/assignment', { sessionId });
    expect(res.status).toBe(404);
  });

  it('固定（pinned）時のrunnersUpは常に空であり、採用（固定）モデル自身を含まない', async () => {
    // packages/router-core/src/assignmentDecider.ts の selectModel() は、status が
    // 'pinned' の場合 runnersUp を常に [] として返す（採用モデルの順位に関わらず）。
    // DB復元側（assignmentRepository.loadAssignmentDetail）がこの意味論を壊していないことを検証する。
    const sessionId = await issueSession();
    const created = await apiRequest('/api/tasks', { method: 'POST', sessionId, body: TASK_BODY });
    const taskId = (created.body as { task: { id: number } }).task.id;

    const before = await apiRequest(`/api/tasks/${taskId}/assignment`, { sessionId });
    const beforeBody = before.body as {
      assignment: { candidates: readonly { modelId: string; passed: boolean; rank: number | null }[] };
    };
    const rankedModelIds = beforeBody.assignment.candidates
      .filter((c) => c.passed && c.rank !== null)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((c) => c.modelId);
    // rank 1位ではないモデルを固定し、「rankedCandidatesの先頭を除くスライス」で誤って
    // runnersUpを再構築するバグ（採用モデル自身が次点候補に混入する）を再現する。
    const nonTopModelId = rankedModelIds[1];
    expect(nonTopModelId).toBeDefined();

    const pinRes = await apiRequest(`/api/tasks/${taskId}/pin`, {
      method: 'POST',
      sessionId,
      body: { modelId: nonTopModelId },
    });
    expect(pinRes.status).toBe(200);

    const detail = await apiRequest(`/api/tasks/${taskId}/assignment`, { sessionId });
    const body = detail.body as {
      assignment: { status: string; adoptedModelId: string; runnersUp: readonly { modelId: string }[] };
    };
    expect(body.assignment.status).toBe('pinned');
    expect(body.assignment.adoptedModelId).toBe(nonTopModelId);
    expect(body.assignment.runnersUp).toEqual([]);
  });
});
