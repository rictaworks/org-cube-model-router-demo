import { describe, expect, it } from 'vitest';
import { API_MESSAGES } from '../config.js';
import { apiRequest, issueSession } from '../test-support/testClient.js';

const VALID_TASK_BODY = {
  name: 'テストタスク',
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

describe('F3 タスク管理（requirements.md 3.5節）', () => {
  it('タスクを登録できる（F5：登録と同時に割当が計算される）', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/tasks', { method: 'POST', sessionId, body: VALID_TASK_BODY });
    expect(res.status).toBe(201);
    const taskId = (res.body as { task: { id: number } }).task.id;

    const assignments = await apiRequest('/api/assignments', { sessionId });
    const list = (assignments.body as { assignments: readonly { taskId: number; status: string }[] }).assignments;
    expect(list.find((a) => a.taskId === taskId)?.status).toBe('assigned');
  });

  it('種別が不正なら400を返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/tasks', {
      method: 'POST',
      sessionId,
      body: { ...VALID_TASK_BODY, taskKind: '不正' },
    });
    expect(res.status).toBe(400);
  });

  it('入力トークン見積が範囲外なら400を返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/tasks', {
      method: 'POST',
      sessionId,
      body: { ...VALID_TASK_BODY, inputTokens: 0 },
    });
    expect(res.status).toBe(400);
    const body = res.body as { message: string };
    expect(body.message).toContain('入力トークン見積');
  });

  it('needsImage が真偽値でない場合、名称用ではなくフィールドに即したエラーメッセージを返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/tasks', {
      method: 'POST',
      sessionId,
      body: { ...VALID_TASK_BODY, needsImage: '真偽値ではない' },
    });
    expect(res.status).toBe(400);
    const body = res.body as { message: string };
    expect(body.message).toBe(API_MESSAGES.invalidNeedsImage);
    expect(body.message).not.toBe(API_MESSAGES.invalidName);
  });

  it('タスクを更新できる', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/tasks', { method: 'POST', sessionId, body: VALID_TASK_BODY });
    const taskId = (created.body as { task: { id: number } }).task.id;

    const res = await apiRequest(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      sessionId,
      body: { ...VALID_TASK_BODY, name: '更新後タスク' },
    });
    expect(res.status).toBe(200);

    const detail = await apiRequest(`/api/tasks/${taskId}`, { sessionId });
    expect((detail.body as { task: { name: string } }).task.name).toBe('更新後タスク');
  });

  it('存在しないタスクの更新は404を返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/tasks/999', { method: 'PATCH', sessionId, body: VALID_TASK_BODY });
    expect(res.status).toBe(404);
  });

  it('タスクを削除できる', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/tasks', { method: 'POST', sessionId, body: VALID_TASK_BODY });
    const taskId = (created.body as { task: { id: number } }).task.id;

    const res = await apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE', sessionId });
    expect(res.status).toBe(200);

    const list = await apiRequest('/api/tasks', { sessionId });
    expect((list.body as { tasks: readonly unknown[] }).tasks).toHaveLength(0);
  });
});
