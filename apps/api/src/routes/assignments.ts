/**
 * F5：割当計算の結果一覧、F6：根拠表示（requirements.md 2章・4.5・4.6節）。
 * 計算そのもの（関数B→C→D）は各CRUDエンドポイントが recomputeSession 経由で
 * 都度実行済みであるため、ここではD1に保存された最新の割当・評価行を返す。
 */
import { Hono } from 'hono';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError } from '../errors.js';
import { loadAssignmentDetail, loadAssignmentSummaries } from '../repositories/assignmentRepository.js';
import { findTaskById } from '../repositories/taskRepository.js';
import type { AppEnv } from '../types.js';
import { parsePositiveIntParam } from '../validation.js';

/** F5：割当計算の結果一覧（/api/assignments）。 */
export const assignmentsRouter = new Hono<AppEnv>();

assignmentsRouter.get('/', async (c) => {
  const sessionId = c.get('sessionId');
  const assignments = await loadAssignmentSummaries(c.env.DB, sessionId);
  return c.json({ assignments });
});

/** F6：タスク単位の根拠表示（/api/tasks/:id/assignment）。 */
export const taskAssignmentRouter = new Hono<AppEnv>();

taskAssignmentRouter.get('/:id/assignment', async (c) => {
  const sessionId = c.get('sessionId');
  const taskId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.taskNotFound);

  const task = await findTaskById(c.env.DB, sessionId, taskId);
  if (task === null) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }

  const detail = await loadAssignmentDetail(c.env.DB, sessionId, taskId);
  if (detail === null) {
    throw new ApiNotFoundError(API_MESSAGES.assignmentNotFound);
  }

  return c.json({ assignment: detail });
});
