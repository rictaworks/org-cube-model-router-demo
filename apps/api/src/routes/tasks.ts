/**
 * F3：タスク管理（requirements.md 2章・3.5節）。座標・属性のCRUD。
 * 登録・更新・削除のたびに関数E（recomputeSession）を呼び出し、F5（割当計算）を
 * 満たす（requirements.md 9.1節のシーケンス図に対応）。
 */
import { Hono } from 'hono';
import {
  INPUT_TOKEN_RANGE,
  MAX_TASKS,
  MONTHLY_RUNS_RANGE,
  OUTPUT_TOKEN_RANGE,
} from '@org-cube-model-router-demo/router-core';
import type { Difficulty, LatencyNeed, Selector, Sensitivity, TaskKind } from '@org-cube-model-router-demo/router-core';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError, ApiValidationError } from '../errors.js';
import { recomputeSession } from '../recompute.js';
import { loadDimensions } from '../repositories/dimensionRepository.js';
import {
  deleteTaskCascade,
  findTaskById,
  insertTask,
  loadTasks,
  taskCount,
  updateTask,
  type TaskWriteInput,
} from '../repositories/taskRepository.js';
import type { AppEnv } from '../types.js';
import { parsePositiveIntParam, requireBoolean, requireEnum, requireIntegerInRange, requireObject, requireString } from '../validation.js';

const TASK_KINDS: readonly TaskKind[] = [
  'summarize',
  'translate',
  'classify',
  'extract',
  'codegen',
  'dialogue',
  'reasoning',
];
const DIFFICULTIES: readonly Difficulty[] = ['low', 'medium', 'high'];
const SENSITIVITIES: readonly Sensitivity[] = ['public', 'internal', 'confidential', 'personal'];
const LATENCY_NEEDS: readonly LatencyNeed[] = ['interactive', 'batch'];

function parsePosition(
  value: unknown,
  dimensions: readonly { id: number; values: readonly { id: number }[] }[],
): Selector {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiValidationError(API_MESSAGES.invalidPositionDimension(0));
  }
  const position: Record<number, number> = {};
  for (const [dimensionIdRaw, valueIdRaw] of Object.entries(value as Record<string, unknown>)) {
    const dimensionId = Number(dimensionIdRaw);
    if (!Number.isInteger(dimensionId) || typeof valueIdRaw !== 'number' || !Number.isInteger(valueIdRaw)) {
      throw new ApiValidationError(API_MESSAGES.invalidPositionDimension(dimensionId));
    }
    const dimension = dimensions.find((d) => d.id === dimensionId);
    if (dimension === undefined) {
      throw new ApiValidationError(API_MESSAGES.invalidPositionDimension(dimensionId));
    }
    if (!dimension.values.some((v) => v.id === valueIdRaw)) {
      throw new ApiValidationError(API_MESSAGES.invalidPositionValue(valueIdRaw));
    }
    position[dimensionId] = valueIdRaw;
  }
  return position;
}

function parseTaskInput(
  body: Record<string, unknown>,
  dimensions: readonly { id: number; values: readonly { id: number }[] }[],
): TaskWriteInput {
  return {
    name: requireString(body.name, API_MESSAGES.invalidName),
    taskKind: requireEnum(body.taskKind, TASK_KINDS, API_MESSAGES.invalidTaskKind),
    difficulty: requireEnum(body.difficulty, DIFFICULTIES, API_MESSAGES.invalidDifficulty),
    sensitivity: requireEnum(body.sensitivity, SENSITIVITIES, API_MESSAGES.invalidSensitivity),
    inputTokens: requireIntegerInRange(
      body.inputTokens,
      INPUT_TOKEN_RANGE.min,
      INPUT_TOKEN_RANGE.max,
      API_MESSAGES.invalidInputTokenRange(INPUT_TOKEN_RANGE.min, INPUT_TOKEN_RANGE.max),
    ),
    outputTokens: requireIntegerInRange(
      body.outputTokens,
      OUTPUT_TOKEN_RANGE.min,
      OUTPUT_TOKEN_RANGE.max,
      API_MESSAGES.invalidOutputTokenRange(OUTPUT_TOKEN_RANGE.min, OUTPUT_TOKEN_RANGE.max),
    ),
    latencyNeed: requireEnum(body.latencyNeed, LATENCY_NEEDS, API_MESSAGES.invalidLatencyNeed),
    needsImage: requireBoolean(body.needsImage, API_MESSAGES.invalidNeedsImage),
    monthlyRuns: requireIntegerInRange(
      body.monthlyRuns,
      MONTHLY_RUNS_RANGE.min,
      MONTHLY_RUNS_RANGE.max,
      API_MESSAGES.invalidMonthlyRunsRange(MONTHLY_RUNS_RANGE.min, MONTHLY_RUNS_RANGE.max),
    ),
    position: parsePosition(body.position, dimensions),
  };
}

export const tasksRouter = new Hono<AppEnv>();

tasksRouter.get('/', async (c) => {
  const sessionId = c.get('sessionId');
  const tasks = await loadTasks(c.env.DB, sessionId);
  return c.json({ tasks });
});

tasksRouter.get('/:id', async (c) => {
  const sessionId = c.get('sessionId');
  const taskId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.taskNotFound);
  const task = await findTaskById(c.env.DB, sessionId, taskId);
  if (task === null) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }
  return c.json({ task });
});

tasksRouter.post('/', async (c) => {
  const sessionId = c.get('sessionId');
  const body = requireObject(c.get('parsedBody'));

  const dimensions = await loadDimensions(c.env.DB, sessionId);
  const count = await taskCount(c.env.DB, sessionId);
  if (count >= MAX_TASKS) {
    throw new ApiValidationError(API_MESSAGES.taskLimitExceeded(MAX_TASKS));
  }

  const input = parseTaskInput(body, dimensions);
  const taskId = await insertTask(c.env.DB, sessionId, input);
  console.log(`[tasks] created session_id=${sessionId} task_id=${taskId}`);

  await recomputeSession(c.env.DB, sessionId, 'task', new Date());

  return c.json({ task: { id: taskId, ...input, pinnedModelId: null } }, 201);
});

tasksRouter.patch('/:id', async (c) => {
  const sessionId = c.get('sessionId');
  const taskId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.taskNotFound);
  const body = requireObject(c.get('parsedBody'));

  const existing = await findTaskById(c.env.DB, sessionId, taskId);
  if (existing === null) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }

  const dimensions = await loadDimensions(c.env.DB, sessionId);
  const input = parseTaskInput(body, dimensions);
  await updateTask(c.env.DB, sessionId, taskId, input);
  console.log(`[tasks] updated session_id=${sessionId} task_id=${taskId}`);

  await recomputeSession(c.env.DB, sessionId, 'task', new Date());

  return c.json({ task: { id: taskId, ...input, pinnedModelId: existing.pinnedModelId } });
});

tasksRouter.delete('/:id', async (c) => {
  const sessionId = c.get('sessionId');
  const taskId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.taskNotFound);

  const existing = await findTaskById(c.env.DB, sessionId, taskId);
  if (existing === null) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }

  await deleteTaskCascade(c.env.DB, sessionId, taskId);
  console.log(`[tasks] deleted session_id=${sessionId} task_id=${taskId}`);

  await recomputeSession(c.env.DB, sessionId, 'task', new Date());

  return c.json({ deleted: true });
});
