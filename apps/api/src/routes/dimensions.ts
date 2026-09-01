/**
 * F1：次元管理（requirements.md 2章・4.1節）。
 * 業務ルールの判定は packages/router-core の manageDimension が行う。ここでは
 * 対象データのロード・DBへの反映・（必要な場合の）再計算の呼び出しのみを行う。
 */
import { Hono } from 'hono';
import { manageDimension, POLICY_DISABLED_REASONS } from '@org-cube-model-router-demo/router-core';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError } from '../errors.js';
import { recomputeSession } from '../recompute.js';
import {
  deleteDimensionCascade,
  deleteValue,
  insertDimension,
  insertValue,
  loadDimensions,
  renameDimension,
  renameValue,
} from '../repositories/dimensionRepository.js';
import { loadPolicies } from '../repositories/policyRepository.js';
import { loadTasks } from '../repositories/taskRepository.js';
import type { AppEnv } from '../types.js';
import { parsePositiveIntParam, requireObject, requireString } from '../validation.js';

const PLACEHOLDER_ID = -1;

export const dimensionsRouter = new Hono<AppEnv>();

dimensionsRouter.get('/', async (c) => {
  const sessionId = c.get('sessionId');
  const dimensions = await loadDimensions(c.env.DB, sessionId);
  return c.json({ dimensions });
});

dimensionsRouter.post('/', async (c) => {
  const sessionId = c.get('sessionId');
  const body = requireObject(c.get('parsedBody'));
  const name = requireString(body.name, API_MESSAGES.invalidName);

  const [dimensions, tasks, policies] = await Promise.all([
    loadDimensions(c.env.DB, sessionId),
    loadTasks(c.env.DB, sessionId),
    loadPolicies(c.env.DB, sessionId),
  ]);

  const result = manageDimension({
    dimensions,
    tasks,
    policies,
    operation: { kind: 'add_dimension', name },
    nextDimensionId: PLACEHOLDER_ID,
    nextValueId: PLACEHOLDER_ID,
  });

  const displayOrder = dimensions.length + 1;
  const dimensionId = await insertDimension(c.env.DB, sessionId, name, displayOrder);
  console.log(`[dimensions] added session_id=${sessionId} dimension_id=${dimensionId}`);

  if (result.requiresRecompute) {
    await recomputeSession(c.env.DB, sessionId, 'dimension', new Date());
  }

  return c.json({ dimension: { id: dimensionId, name, displayOrder, values: [] } }, 201);
});

dimensionsRouter.patch('/:id', async (c) => {
  const sessionId = c.get('sessionId');
  const dimensionId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.dimensionNotFound);
  const body = requireObject(c.get('parsedBody'));
  const name = requireString(body.name, API_MESSAGES.invalidName);

  const [dimensions, tasks, policies] = await Promise.all([
    loadDimensions(c.env.DB, sessionId),
    loadTasks(c.env.DB, sessionId),
    loadPolicies(c.env.DB, sessionId),
  ]);

  manageDimension({
    dimensions,
    tasks,
    policies,
    operation: { kind: 'rename_dimension', dimensionId, name },
    nextDimensionId: PLACEHOLDER_ID,
    nextValueId: PLACEHOLDER_ID,
  });

  await renameDimension(c.env.DB, sessionId, dimensionId, name);
  console.log(`[dimensions] renamed session_id=${sessionId} dimension_id=${dimensionId}`);
  return c.json({ dimension: { id: dimensionId, name } });
});

/** 次元削除の影響プレビュー（requirements.md 4.1節手順4・9.3節）。DBへは書き込まない。 */
dimensionsRouter.get('/:id/impact', async (c) => {
  const sessionId = c.get('sessionId');
  const dimensionId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.dimensionNotFound);

  const [dimensions, tasks, policies] = await Promise.all([
    loadDimensions(c.env.DB, sessionId),
    loadTasks(c.env.DB, sessionId),
    loadPolicies(c.env.DB, sessionId),
  ]);

  const result = manageDimension({
    dimensions,
    tasks,
    policies,
    operation: { kind: 'delete_dimension', dimensionId },
    nextDimensionId: PLACEHOLDER_ID,
    nextValueId: PLACEHOLDER_ID,
  });

  return c.json({
    affectedTaskCount: result.affectedTaskCount,
    affectedPolicyIds: result.affectedPolicyIds,
  });
});

dimensionsRouter.delete('/:id', async (c) => {
  const sessionId = c.get('sessionId');
  const dimensionId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.dimensionNotFound);

  const [dimensions, tasks, policies] = await Promise.all([
    loadDimensions(c.env.DB, sessionId),
    loadTasks(c.env.DB, sessionId),
    loadPolicies(c.env.DB, sessionId),
  ]);

  const result = manageDimension({
    dimensions,
    tasks,
    policies,
    operation: { kind: 'delete_dimension', dimensionId },
    nextDimensionId: PLACEHOLDER_ID,
    nextValueId: PLACEHOLDER_ID,
  });

  await deleteDimensionCascade(
    c.env.DB,
    sessionId,
    dimensionId,
    result.affectedPolicyIds,
    POLICY_DISABLED_REASONS.dimensionDeleted,
  );
  console.log(
    `[dimensions] deleted session_id=${sessionId} dimension_id=${dimensionId} affectedTasks=${result.affectedTaskCount} affectedPolicies=${result.affectedPolicyIds.length}`,
  );

  const outcome = await recomputeSession(c.env.DB, sessionId, 'dimension', new Date());

  return c.json({
    affectedTaskCount: result.affectedTaskCount,
    affectedPolicyIds: result.affectedPolicyIds,
    changeImpactCount: outcome.changeImpacts.length,
  });
});

dimensionsRouter.post('/:id/values', async (c) => {
  const sessionId = c.get('sessionId');
  const dimensionId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.dimensionNotFound);
  const body = requireObject(c.get('parsedBody'));
  const name = requireString(body.name, API_MESSAGES.invalidName);

  const [dimensions, tasks, policies] = await Promise.all([
    loadDimensions(c.env.DB, sessionId),
    loadTasks(c.env.DB, sessionId),
    loadPolicies(c.env.DB, sessionId),
  ]);

  manageDimension({
    dimensions,
    tasks,
    policies,
    operation: { kind: 'add_value', dimensionId, name },
    nextDimensionId: PLACEHOLDER_ID,
    nextValueId: PLACEHOLDER_ID,
  });

  const dimension = dimensions.find((d) => d.id === dimensionId);
  if (dimension === undefined) {
    throw new ApiNotFoundError(API_MESSAGES.dimensionNotFound);
  }
  const displayOrder = dimension.values.length + 1;
  const valueId = await insertValue(c.env.DB, sessionId, dimensionId, name, displayOrder);
  console.log(`[dimensions] added value session_id=${sessionId} dimension_id=${dimensionId} value_id=${valueId}`);

  return c.json({ value: { id: valueId, dimensionId, name, displayOrder } }, 201);
});

dimensionsRouter.patch('/:id/values/:valueId', async (c) => {
  const sessionId = c.get('sessionId');
  const dimensionId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.dimensionNotFound);
  const valueId = parsePositiveIntParam(c.req.param('valueId'), API_MESSAGES.valueNotFound);
  const body = requireObject(c.get('parsedBody'));
  const name = requireString(body.name, API_MESSAGES.invalidName);

  const [dimensions, tasks, policies] = await Promise.all([
    loadDimensions(c.env.DB, sessionId),
    loadTasks(c.env.DB, sessionId),
    loadPolicies(c.env.DB, sessionId),
  ]);

  manageDimension({
    dimensions,
    tasks,
    policies,
    operation: { kind: 'rename_value', dimensionId, valueId, name },
    nextDimensionId: PLACEHOLDER_ID,
    nextValueId: PLACEHOLDER_ID,
  });

  await renameValue(c.env.DB, sessionId, valueId, name);
  console.log(`[dimensions] renamed value session_id=${sessionId} dimension_id=${dimensionId} value_id=${valueId}`);
  return c.json({ value: { id: valueId, dimensionId, name } });
});

dimensionsRouter.delete('/:id/values/:valueId', async (c) => {
  const sessionId = c.get('sessionId');
  const dimensionId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.dimensionNotFound);
  const valueId = parsePositiveIntParam(c.req.param('valueId'), API_MESSAGES.valueNotFound);

  const [dimensions, tasks, policies] = await Promise.all([
    loadDimensions(c.env.DB, sessionId),
    loadTasks(c.env.DB, sessionId),
    loadPolicies(c.env.DB, sessionId),
  ]);

  const result = manageDimension({
    dimensions,
    tasks,
    policies,
    operation: { kind: 'delete_value', dimensionId, valueId },
    nextDimensionId: PLACEHOLDER_ID,
    nextValueId: PLACEHOLDER_ID,
  });

  await deleteValue(c.env.DB, sessionId, valueId);
  console.log(`[dimensions] deleted value session_id=${sessionId} dimension_id=${dimensionId} value_id=${valueId}`);

  if (result.requiresRecompute) {
    await recomputeSession(c.env.DB, sessionId, 'dimension', new Date());
  }

  return c.json({ deleted: true });
});
