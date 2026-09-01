/**
 * F2：ポリシー管理（requirements.md 2章・3.3節）。セレクタ・制約・重みのCRUD。
 * 合成・一致判定などのロジック本体は関数B（resolvePolicy）が担うため、ここでは
 * 入力値検証と永続化のみを行う。
 */
import { Hono } from 'hono';
import { MAX_POLICIES } from '@org-cube-model-router-demo/router-core';
import type { Region, Selector } from '@org-cube-model-router-demo/router-core';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError, ApiValidationError } from '../errors.js';
import { recomputeSession } from '../recompute.js';
import { loadDimensions } from '../repositories/dimensionRepository.js';
import {
  deletePolicy,
  findPolicyId,
  insertPolicy,
  loadPolicies,
  policyCount,
  updatePolicy,
  type PolicyWriteInput,
} from '../repositories/policyRepository.js';
import type { AppEnv } from '../types.js';
import {
  optionalBoolean,
  optionalFiniteNumber,
  optionalStringArray,
  parsePositiveIntParam,
  requireInteger,
  requireObject,
  requireString,
} from '../validation.js';

const VALID_REGIONS: readonly Region[] = ['JP', 'US', 'EU'];

function parseSelector(value: unknown, dimensions: readonly { id: number; values: readonly { id: number }[] }[]): Selector {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiValidationError(API_MESSAGES.invalidSelectorShape);
  }
  const selector: Record<number, number> = {};
  for (const [dimensionIdRaw, valueIdRaw] of Object.entries(value as Record<string, unknown>)) {
    const dimensionId = Number(dimensionIdRaw);
    if (!Number.isInteger(dimensionId) || typeof valueIdRaw !== 'number' || !Number.isInteger(valueIdRaw)) {
      throw new ApiValidationError(API_MESSAGES.invalidSelectorDimension(dimensionId));
    }
    const dimension = dimensions.find((d) => d.id === dimensionId);
    if (dimension === undefined) {
      throw new ApiValidationError(API_MESSAGES.invalidSelectorDimension(dimensionId));
    }
    if (!dimension.values.some((v) => v.id === valueIdRaw)) {
      throw new ApiValidationError(API_MESSAGES.invalidSelectorValue(valueIdRaw));
    }
    selector[dimensionId] = valueIdRaw;
  }
  return selector;
}

function parseRegions(value: unknown): readonly Region[] | undefined {
  const arr = optionalStringArray(value, API_MESSAGES.invalidRegion);
  if (arr === undefined) {
    return undefined;
  }
  for (const region of arr) {
    if (!VALID_REGIONS.includes(region as Region)) {
      throw new ApiValidationError(API_MESSAGES.invalidRegion);
    }
  }
  return arr as readonly Region[];
}

function parsePolicyInput(
  body: Record<string, unknown>,
  dimensions: readonly { id: number; values: readonly { id: number }[] }[],
): PolicyWriteInput {
  const name = requireString(body.name, API_MESSAGES.invalidName);
  const priority = body.priority === undefined ? 0 : requireInteger(body.priority, API_MESSAGES.invalidPriority);
  const selector = parseSelector(body.selector, dimensions);
  const allowedRegions = parseRegions(body.allowedRegions);
  const allowedProviders = optionalStringArray(body.allowedProviders, API_MESSAGES.invalidAllowedProviders);
  const bannedModels = optionalStringArray(body.bannedModels, API_MESSAGES.invalidBannedModels);
  const requireLocal = optionalBoolean(body.requireLocal, API_MESSAGES.invalidRequireLocal);
  const maxCostPerRun = optionalFiniteNumber(body.maxCostPerRun, API_MESSAGES.invalidMaxCostPerRun);
  if (maxCostPerRun !== undefined && maxCostPerRun < 0) {
    throw new ApiValidationError(API_MESSAGES.invalidMaxCostPerRun);
  }
  const weightQuality = optionalFiniteNumber(body.weightQuality, API_MESSAGES.invalidWeight);
  const weightCost = optionalFiniteNumber(body.weightCost, API_MESSAGES.invalidWeight);
  const weightLatency = optionalFiniteNumber(body.weightLatency, API_MESSAGES.invalidWeight);
  for (const w of [weightQuality, weightCost, weightLatency]) {
    if (w !== undefined && w < 0) {
      throw new ApiValidationError(API_MESSAGES.invalidWeight);
    }
  }

  return {
    name,
    priority,
    selector,
    allowedRegions,
    allowedProviders,
    bannedModels,
    requireLocal,
    maxCostPerRun,
    weightQuality,
    weightCost,
    weightLatency,
  };
}

export const policiesRouter = new Hono<AppEnv>();

policiesRouter.get('/', async (c) => {
  const sessionId = c.get('sessionId');
  const policies = await loadPolicies(c.env.DB, sessionId);
  return c.json({ policies });
});

policiesRouter.post('/', async (c) => {
  const sessionId = c.get('sessionId');
  const body = requireObject(c.get('parsedBody'));

  const dimensions = await loadDimensions(c.env.DB, sessionId);
  const count = await policyCount(c.env.DB, sessionId);
  if (count >= MAX_POLICIES) {
    throw new ApiValidationError(API_MESSAGES.policyLimitExceeded(MAX_POLICIES));
  }

  const input = parsePolicyInput(body, dimensions);
  const policyId = await insertPolicy(c.env.DB, sessionId, input);
  console.log(`[policies] created session_id=${sessionId} policy_id=${policyId}`);

  await recomputeSession(c.env.DB, sessionId, 'policy', new Date());

  return c.json({ policy: { id: policyId, ...input, status: 'active' } }, 201);
});

policiesRouter.patch('/:id', async (c) => {
  const sessionId = c.get('sessionId');
  const policyId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.policyNotFound);
  const body = requireObject(c.get('parsedBody'));

  const exists = await findPolicyId(c.env.DB, sessionId, policyId);
  if (!exists) {
    throw new ApiNotFoundError(API_MESSAGES.policyNotFound);
  }

  const dimensions = await loadDimensions(c.env.DB, sessionId);
  const input = parsePolicyInput(body, dimensions);
  await updatePolicy(c.env.DB, sessionId, policyId, input);
  console.log(`[policies] updated session_id=${sessionId} policy_id=${policyId}`);

  await recomputeSession(c.env.DB, sessionId, 'policy', new Date());

  return c.json({ policy: { id: policyId, ...input, status: 'active' } });
});

policiesRouter.delete('/:id', async (c) => {
  const sessionId = c.get('sessionId');
  const policyId = parsePositiveIntParam(c.req.param('id'), API_MESSAGES.policyNotFound);

  const exists = await findPolicyId(c.env.DB, sessionId, policyId);
  if (!exists) {
    throw new ApiNotFoundError(API_MESSAGES.policyNotFound);
  }

  await deletePolicy(c.env.DB, sessionId, policyId);
  console.log(`[policies] deleted session_id=${sessionId} policy_id=${policyId}`);

  await recomputeSession(c.env.DB, sessionId, 'policy', new Date());

  return c.json({ deleted: true });
});
