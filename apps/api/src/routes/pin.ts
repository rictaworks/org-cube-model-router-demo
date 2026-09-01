/**
 * F7：固定割当・解除（requirements.md 2章・4.7節）。
 * 受理判定は関数F（pinModel）が担う。受理された場合のみ tasks.pinned_model_id を
 * 更新し、関数D（selectModel）を再実行するため recomputeSession を呼ぶ。
 */
import { Hono } from 'hono';
import { pinModel } from '@org-cube-model-router-demo/router-core';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError } from '../errors.js';
import { recomputeSession } from '../recompute.js';
import { loadAssignmentDetail, loadEvaluationRows } from '../repositories/assignmentRepository.js';
import { findTaskById, updatePinnedModel } from '../repositories/taskRepository.js';
import type { AppEnv } from '../types.js';
import { parsePositiveIntParam, requireObject, requireString } from '../validation.js';

export const pinRouter = new Hono<AppEnv>();

pinRouter.post('/:id/pin', async (c) => {
  const sessionId = c.get('sessionId');
  const taskId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.taskNotFound);
  const body = requireObject(c.get('parsedBody'));
  const modelId = requireString(body.modelId, API_MESSAGES.invalidName);

  const task = await findTaskById(c.env.DB, sessionId, taskId);
  if (task === null) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }

  const evaluationRows = await loadEvaluationRows(c.env.DB, taskId);
  const decision = pinModel({ modelId, evaluationRows });

  if (!decision.accepted) {
    console.error(
      `[pin] rejected session_id=${sessionId} task_id=${taskId} model_id=${modelId} reasons=${decision.reasonCodes.join(',')}`,
    );
    // 理由コードをすべて提示する（requirements.md 4.7節手順2）。単一のエラーメッセージに
    // 畳み込まず、reasonCodes を構造化フィールドとして返す。
    return c.json({ message: API_MESSAGES.pinRejected, reasonCodes: decision.reasonCodes }, 409);
  }

  await updatePinnedModel(c.env.DB, sessionId, taskId, modelId);
  console.log(`[pin] accepted session_id=${sessionId} task_id=${taskId} model_id=${modelId}`);

  await recomputeSession(c.env.DB, sessionId, 'task', new Date());

  const detail = await loadAssignmentDetail(c.env.DB, sessionId, taskId);
  return c.json({ assignment: detail });
});

pinRouter.delete('/:id/pin', async (c) => {
  const sessionId = c.get('sessionId');
  const taskId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.taskNotFound);

  const task = await findTaskById(c.env.DB, sessionId, taskId);
  if (task === null) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }

  await updatePinnedModel(c.env.DB, sessionId, taskId, null);
  console.log(`[pin] released session_id=${sessionId} task_id=${taskId}`);

  await recomputeSession(c.env.DB, sessionId, 'task', new Date());

  const detail = await loadAssignmentDetail(c.env.DB, sessionId, taskId);
  return c.json({ assignment: detail });
});
