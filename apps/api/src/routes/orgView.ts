/**
 * F9：組織ビュー（requirements.md 2章・13.2節）。任意の2次元を縦横に選び、
 * 各セルのタスク数・採用モデルの内訳・未割当数を表で表示する。
 * 次元が1個以下の場合は1次元（または次元なし）の一覧表示に切り替える。
 */
import { Hono } from 'hono';
import type { AssignmentStatus, Dimension, DimensionId, ModelId, ValueId } from '@org-cube-model-router-demo/router-core';
import { API_MESSAGES } from '../config.js';
import { ApiValidationError } from '../errors.js';
import { loadAssignmentSummaries } from '../repositories/assignmentRepository.js';
import { loadDimensions } from '../repositories/dimensionRepository.js';
import { loadTasks } from '../repositories/taskRepository.js';
import type { AppEnv } from '../types.js';
import { parsePositiveIntParam } from '../validation.js';

interface CellAggregate {
  taskCount: number;
  unassignedCount: number;
  pinViolatedCount: number;
  byModel: Record<ModelId, number>;
}

function newCell(): CellAggregate {
  return { taskCount: 0, unassignedCount: 0, pinViolatedCount: 0, byModel: {} };
}

function accumulate(cell: CellAggregate, status: AssignmentStatus, adoptedModelId: ModelId | null): void {
  cell.taskCount += 1;
  if (status === 'unassigned') {
    cell.unassignedCount += 1;
  } else if (status === 'pin_violated') {
    cell.pinViolatedCount += 1;
  }
  if (adoptedModelId !== null) {
    cell.byModel[adoptedModelId] = (cell.byModel[adoptedModelId] ?? 0) + 1;
  }
}

const UNSET_KEY = 'unset';
const ALL_KEY = 'all';

function keyOf(valueId: ValueId | undefined): string {
  return valueId === undefined ? UNSET_KEY : String(valueId);
}

function findDimensionOrThrow(dimensions: readonly Dimension[], dimensionId: DimensionId): Dimension {
  const dimension = dimensions.find((d) => d.id === dimensionId);
  if (dimension === undefined) {
    throw new ApiValidationError(API_MESSAGES.invalidOrgViewDimension);
  }
  return dimension;
}

export const orgViewRouter = new Hono<AppEnv>();

orgViewRouter.get('/', async (c) => {
  const sessionId = c.get('sessionId');
  const dimensions = await loadDimensions(c.env.DB, sessionId);
  const tasks = await loadTasks(c.env.DB, sessionId);
  const assignments = await loadAssignmentSummaries(c.env.DB, sessionId);
  const assignmentByTaskId = new Map(assignments.map((a) => [a.taskId, a]));

  if (dimensions.length === 0) {
    const overall = newCell();
    for (const task of tasks) {
      const assignment = assignmentByTaskId.get(task.id);
      if (assignment !== undefined) {
        accumulate(overall, assignment.status, assignment.adoptedModelId);
      }
    }
    return c.json({ mode: 'none', overall });
  }

  const rowDimensionIdRaw = c.req.query('rowDimensionId');
  const rowDimensionId =
    rowDimensionIdRaw === undefined
      ? dimensions[0]!.id
      : parsePositiveIntParam(rowDimensionIdRaw, API_MESSAGES.invalidOrgViewDimension);
  const rowDimension = findDimensionOrThrow(dimensions, rowDimensionId);

  const colDimensionIdRaw = c.req.query('colDimensionId');
  const colDimension =
    colDimensionIdRaw === undefined
      ? undefined
      : findDimensionOrThrow(dimensions, parsePositiveIntParam(colDimensionIdRaw, API_MESSAGES.invalidOrgViewDimension));

  const cells = new Map<string, CellAggregate>();
  for (const task of tasks) {
    const assignment = assignmentByTaskId.get(task.id);
    if (assignment === undefined) {
      continue;
    }
    const rowKey = keyOf(task.position[rowDimension.id]);
    const colKey = colDimension === undefined ? ALL_KEY : keyOf(task.position[colDimension.id]);
    const cellKey = `${rowKey}::${colKey}`;
    const cell = cells.get(cellKey) ?? newCell();
    accumulate(cell, assignment.status, assignment.adoptedModelId);
    cells.set(cellKey, cell);
  }

  const rowKeys = [...rowDimension.values.map((v) => String(v.id)), UNSET_KEY];
  const colKeys = colDimension === undefined ? [ALL_KEY] : [...colDimension.values.map((v) => String(v.id)), UNSET_KEY];

  const table = rowKeys.map((rowKey) => ({
    rowValueId: rowKey === UNSET_KEY ? null : Number(rowKey),
    cells: colKeys.map((colKey) => ({
      colValueId: colKey === UNSET_KEY || colKey === ALL_KEY ? null : Number(colKey),
      ...(cells.get(`${rowKey}::${colKey}`) ?? newCell()),
    })),
  }));

  return c.json({
    mode: colDimension === undefined ? 'single' : 'cross',
    rowDimension: { id: rowDimension.id, name: rowDimension.name, values: rowDimension.values },
    colDimension: colDimension === undefined ? null : { id: colDimension.id, name: colDimension.name, values: colDimension.values },
    table,
  });
});
