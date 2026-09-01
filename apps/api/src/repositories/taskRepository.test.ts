/**
 * taskRepository のセッション分離（多層防御）に関する単体テスト。
 *
 * ルートハンドラの事前所有権チェック（findTaskById等）を経由せず、リポジトリ関数を
 * 直接呼び出すことで、SQL自体の `session_id` 絞り込みが機能していることを検証する。
 */
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { ApiNotFoundError } from '../errors.js';
import { ensureCatalogSeeded } from './catalogRepository.js';
import { insertDimension, insertValue } from './dimensionRepository.js';
import { createSession } from './sessionRepository.js';
import {
  deleteTaskCascade,
  findTaskById,
  insertTask,
  loadTasks,
  updatePinnedModel,
  updateTask,
  type TaskWriteInput,
} from './taskRepository.js';

const BASE_TASK_INPUT: TaskWriteInput = {
  name: 'タスクA',
  taskKind: 'summarize',
  difficulty: 'low',
  sensitivity: 'public',
  inputTokens: 100,
  outputTokens: 100,
  latencyNeed: 'interactive',
  needsImage: false,
  monthlyRuns: 0,
  position: {},
};

async function setUpTwoSessions(): Promise<{ ownerSessionId: string; otherSessionId: string }> {
  const ownerSessionId = crypto.randomUUID();
  const otherSessionId = crypto.randomUUID();
  const now = new Date();
  await createSession(env.DB, ownerSessionId, now);
  await createSession(env.DB, otherSessionId, now);
  return { ownerSessionId, otherSessionId };
}

describe('taskRepository のセッション分離', () => {
  it('updateTask: 他セッションのIDでは更新できず、内容は変わらない', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const taskId = await insertTask(env.DB, ownerSessionId, BASE_TASK_INPUT);

    await expect(
      updateTask(env.DB, otherSessionId, taskId, { ...BASE_TASK_INPUT, name: '乗っ取り' }),
    ).rejects.toBeInstanceOf(ApiNotFoundError);

    const task = await findTaskById(env.DB, ownerSessionId, taskId);
    expect(task?.name).toBe('タスクA');
  });

  it('updateTask: 座標を持つタスクを他セッションから更新しようとしても座標は変わらない', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '部門', 1);
    const valueId = await insertValue(env.DB, ownerSessionId, dimensionId, '営業', 1);
    const taskId = await insertTask(env.DB, ownerSessionId, {
      ...BASE_TASK_INPUT,
      position: { [dimensionId]: valueId },
    });

    await expect(
      updateTask(env.DB, otherSessionId, taskId, { ...BASE_TASK_INPUT, position: {} }),
    ).rejects.toBeInstanceOf(ApiNotFoundError);

    const task = await findTaskById(env.DB, ownerSessionId, taskId);
    expect(task?.position).toEqual({ [dimensionId]: valueId });
  });

  it('updatePinnedModel: 他セッションのIDでは固定できず、固定状態は変わらない', async () => {
    await ensureCatalogSeeded(env.DB);
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const taskId = await insertTask(env.DB, ownerSessionId, BASE_TASK_INPUT);

    await expect(updatePinnedModel(env.DB, otherSessionId, taskId, 'aster-l')).rejects.toBeInstanceOf(
      ApiNotFoundError,
    );

    const task = await findTaskById(env.DB, ownerSessionId, taskId);
    expect(task?.pinnedModelId).toBeNull();
  });

  it('deleteTaskCascade: 他セッションのIDでは削除できず、タスク・座標が残る', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '部門', 1);
    const valueId = await insertValue(env.DB, ownerSessionId, dimensionId, '営業', 1);
    const taskId = await insertTask(env.DB, ownerSessionId, {
      ...BASE_TASK_INPUT,
      position: { [dimensionId]: valueId },
    });

    // 攻撃者（otherSessionId）が自セッションのタスクだと偽って、被害者のタスクIDを指定するケース。
    await expect(deleteTaskCascade(env.DB, otherSessionId, taskId)).rejects.toBeInstanceOf(ApiNotFoundError);

    const tasks = await loadTasks(env.DB, ownerSessionId);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.position).toEqual({ [dimensionId]: valueId });
  });

  it('正しいセッションIDでは更新・固定・削除できる（回帰確認）', async () => {
    await ensureCatalogSeeded(env.DB);
    const { ownerSessionId } = await setUpTwoSessions();
    const taskId = await insertTask(env.DB, ownerSessionId, BASE_TASK_INPUT);

    await updateTask(env.DB, ownerSessionId, taskId, { ...BASE_TASK_INPUT, name: '更新後' });
    expect((await findTaskById(env.DB, ownerSessionId, taskId))?.name).toBe('更新後');

    await updatePinnedModel(env.DB, ownerSessionId, taskId, 'aster-l');
    expect((await findTaskById(env.DB, ownerSessionId, taskId))?.pinnedModelId).toBe('aster-l');

    await deleteTaskCascade(env.DB, ownerSessionId, taskId);
    expect(await loadTasks(env.DB, ownerSessionId)).toHaveLength(0);
  });
});
