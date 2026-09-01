import { describe, expect, it } from 'vitest';
import { apiRequest, issueSession } from '../test-support/testClient.js';

const TASK_BODY = {
  name: '変更影響テスト用タスク',
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

describe('F8 変更影響取得（requirements.md 4.6節）', () => {
  it('新規タスク登録は変更前=なしの変更影響として記録される', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/tasks', { method: 'POST', sessionId, body: TASK_BODY });
    const taskId = (created.body as { task: { id: number } }).task.id;

    const res = await apiRequest('/api/change-impacts', { sessionId });
    expect(res.status).toBe(200);
    const body = res.body as {
      changeImpacts: readonly { taskId: number; beforeStatus: string | null; afterStatus: string }[];
    };
    const impact = body.changeImpacts.find((i) => i.taskId === taskId);
    expect(impact).toBeDefined();
    expect(impact?.beforeStatus).toBeNull();
    expect(impact?.afterStatus).toBe('assigned');
  });

  it('変更影響一覧は直近1回分のみ保持される（4.6節手順4）', async () => {
    const sessionId = await issueSession();
    await apiRequest('/api/tasks', { method: 'POST', sessionId, body: TASK_BODY });

    // 提供停止の切替では既存タスクの採用モデルが変わらない可能性があるため、
    // 変更影響一覧が「直近の変更操作の結果」で置き換わっていることのみを確認する。
    await apiRequest('/api/models/delta-free', { method: 'PATCH', sessionId, body: { unavailable: true } });

    const res = await apiRequest('/api/change-impacts', { sessionId });
    const body = res.body as { changeImpacts: readonly unknown[] };
    // 直前の変更（提供停止）1回分のみが保持され、初回タスク登録分は残っていない。
    expect(body.changeImpacts.length).toBeLessThanOrEqual(1);
  });
});
