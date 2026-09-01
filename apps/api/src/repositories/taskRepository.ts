/**
 * tasks・task_positions の D1リポジトリ（F3：requirements.md 3.5節）。
 */
import type {
  Difficulty,
  LatencyNeed,
  ModelId,
  Position,
  Selector,
  Sensitivity,
  Task,
  TaskId,
  TaskKind,
} from '@org-cube-model-router-demo/router-core';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError } from '../errors.js';

interface TaskRow {
  readonly id: number;
  readonly name: string;
  readonly task_kind: string;
  readonly difficulty: string;
  readonly sensitivity: string;
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly latency_need: string;
  readonly needs_image: number;
  readonly monthly_runs: number;
  readonly pinned_model_id: string | null;
}

interface TaskPositionRow {
  readonly task_id: number;
  readonly dimension_id: number;
  readonly value_id: number;
}

export interface TaskWriteInput {
  readonly name: string;
  readonly taskKind: TaskKind;
  readonly difficulty: Difficulty;
  readonly sensitivity: Sensitivity;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyNeed: LatencyNeed;
  readonly needsImage: boolean;
  readonly monthlyRuns: number;
  readonly position: Selector;
}

function toTask(row: TaskRow, position: Position): Task {
  return {
    id: row.id,
    name: row.name,
    taskKind: row.task_kind as TaskKind,
    difficulty: row.difficulty as Difficulty,
    sensitivity: row.sensitivity as Sensitivity,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    latencyNeed: row.latency_need as LatencyNeed,
    needsImage: row.needs_image === 1,
    monthlyRuns: row.monthly_runs,
    position,
    pinnedModelId: row.pinned_model_id,
  };
}

export async function loadTasks(db: D1Database, sessionId: string): Promise<readonly Task[]> {
  const [tasksResult, positionsResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, task_kind, difficulty, sensitivity, input_tokens, output_tokens, latency_need,
                needs_image, monthly_runs, pinned_model_id
         FROM tasks WHERE session_id = ?1 ORDER BY id`,
      )
      .bind(sessionId)
      .all<TaskRow>(),
    db
      .prepare(
        `SELECT tp.task_id AS task_id, tp.dimension_id AS dimension_id, tp.value_id AS value_id
         FROM task_positions tp
         INNER JOIN tasks t ON t.id = tp.task_id
         WHERE t.session_id = ?1`,
      )
      .bind(sessionId)
      .all<TaskPositionRow>(),
  ]);

  const positionByTask = new Map<number, Position & Record<number, number>>();
  for (const row of positionsResult.results) {
    const position = positionByTask.get(row.task_id) ?? {};
    (position as Record<number, number>)[row.dimension_id] = row.value_id;
    positionByTask.set(row.task_id, position);
  }

  return tasksResult.results.map((row) => toTask(row, positionByTask.get(row.id) ?? {}));
}

export async function findTaskById(db: D1Database, sessionId: string, taskId: TaskId): Promise<Task | null> {
  const row = await db
    .prepare(
      `SELECT id, name, task_kind, difficulty, sensitivity, input_tokens, output_tokens, latency_need,
              needs_image, monthly_runs, pinned_model_id
       FROM tasks WHERE id = ?1 AND session_id = ?2`,
    )
    .bind(taskId, sessionId)
    .first<TaskRow>();
  if (row === null) {
    return null;
  }
  const positions = await db
    .prepare('SELECT task_id, dimension_id, value_id FROM task_positions WHERE task_id = ?1')
    .bind(taskId)
    .all<TaskPositionRow>();
  const position: Record<number, number> = {};
  for (const p of positions.results) {
    position[p.dimension_id] = p.value_id;
  }
  return toTask(row, position);
}

export async function taskCount(db: D1Database, sessionId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM tasks WHERE session_id = ?1')
    .bind(sessionId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function replacePositions(db: D1Database, taskId: TaskId, position: Selector): Promise<void> {
  const statements = [
    db.prepare('DELETE FROM task_positions WHERE task_id = ?1').bind(taskId),
    ...Object.entries(position).map(([dimensionId, valueId]) =>
      db
        .prepare('INSERT INTO task_positions (task_id, dimension_id, value_id) VALUES (?1, ?2, ?3)')
        .bind(taskId, Number(dimensionId), valueId),
    ),
  ];
  await db.batch(statements);
}

export async function insertTask(db: D1Database, sessionId: string, input: TaskWriteInput): Promise<TaskId> {
  const result = await db
    .prepare(
      `INSERT INTO tasks
         (session_id, name, task_kind, difficulty, sensitivity, input_tokens, output_tokens, latency_need,
          needs_image, monthly_runs, pinned_model_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL)`,
    )
    .bind(
      sessionId,
      input.name,
      input.taskKind,
      input.difficulty,
      input.sensitivity,
      input.inputTokens,
      input.outputTokens,
      input.latencyNeed,
      input.needsImage ? 1 : 0,
      input.monthlyRuns,
    )
    .run();
  const taskId = result.meta.last_row_id;
  await replacePositions(db, taskId, input.position);
  return taskId;
}

/**
 * タスクを更新する。多層防御として `session_id` でも絞り込み、影響行数が0件
 * （自セッションが所有するタスクでなかった）の場合は例外を投げる
 * （CLAUDE.md「フォールバック禁止」）。tasks本体の更新が確認できてから
 * task_positions（session_id列を持たないため、既に確認済みのtaskIdのみを使う）を
 * 置き換える。
 */
export async function updateTask(
  db: D1Database,
  sessionId: string,
  taskId: TaskId,
  input: TaskWriteInput,
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE tasks SET
         name = ?1, task_kind = ?2, difficulty = ?3, sensitivity = ?4, input_tokens = ?5, output_tokens = ?6,
         latency_need = ?7, needs_image = ?8, monthly_runs = ?9
       WHERE id = ?10 AND session_id = ?11`,
    )
    .bind(
      input.name,
      input.taskKind,
      input.difficulty,
      input.sensitivity,
      input.inputTokens,
      input.outputTokens,
      input.latencyNeed,
      input.needsImage ? 1 : 0,
      input.monthlyRuns,
      taskId,
      sessionId,
    )
    .run();
  if (result.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }
  await replacePositions(db, taskId, input.position);
}

export async function updatePinnedModel(
  db: D1Database,
  sessionId: string,
  taskId: TaskId,
  modelId: ModelId | null,
): Promise<void> {
  const result = await db
    .prepare('UPDATE tasks SET pinned_model_id = ?1 WHERE id = ?2 AND session_id = ?3')
    .bind(modelId, taskId, sessionId)
    .run();
  if (result.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }
}

/**
 * タスク削除（requirements.md 6章）。子テーブルから順に削除する。
 * assignment_candidates・task_positions は自身に session_id 列を持たないため、
 * 対象の task_id が自セッションの tasks 行に属することを EXISTS 句で確認したうえで
 * 削除する（多層防御）。最後に tasks 本体の削除件数を確認し、0件（自セッションが
 * 所有するタスクでなかった）なら例外を投げる。
 */
export async function deleteTaskCascade(db: D1Database, sessionId: string, taskId: TaskId): Promise<void> {
  const results = await db.batch([
    db
      .prepare(
        `DELETE FROM assignment_candidates
         WHERE task_id = ?1
           AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = ?1 AND t.session_id = ?2)`,
      )
      .bind(taskId, sessionId),
    db.prepare('DELETE FROM change_impacts WHERE task_id = ?1 AND session_id = ?2').bind(taskId, sessionId),
    db.prepare('DELETE FROM assignments WHERE task_id = ?1 AND session_id = ?2').bind(taskId, sessionId),
    db
      .prepare(
        `DELETE FROM task_positions
         WHERE task_id = ?1
           AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = ?1 AND t.session_id = ?2)`,
      )
      .bind(taskId, sessionId),
    db.prepare('DELETE FROM tasks WHERE id = ?1 AND session_id = ?2').bind(taskId, sessionId),
  ]);

  const taskDeleteResult = results[results.length - 1];
  if (taskDeleteResult === undefined || taskDeleteResult.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.taskNotFound);
  }
}
