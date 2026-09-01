/**
 * F10：サンプル読込（requirements.md 2章・5.3節）。
 * 空のセッションに data/sample_org.json の次元・ポリシー・タスクを一括投入する。
 */
import { Hono } from 'hono';
import { API_MESSAGES } from '../config.js';
import { ApiConflictError } from '../errors.js';
import { recomputeSession } from '../recompute.js';
import { insertDimension, insertValue } from '../repositories/dimensionRepository.js';
import { insertPolicy } from '../repositories/policyRepository.js';
import { insertTask } from '../repositories/taskRepository.js';
import { loadDimensions } from '../repositories/dimensionRepository.js';
import { loadPolicies } from '../repositories/policyRepository.js';
import { loadTasks } from '../repositories/taskRepository.js';
import { loadSampleOrgFixture } from '../sampleData.js';
import type { AppEnv } from '../types.js';

/** F10：フィクスチャの内部不整合（selector/positionが参照する次元・値が見つからない）。 */
function fixtureInconsistencyError(dimensionName: string, valueName: string): Error {
  return new Error(API_MESSAGES.fixtureInconsistencyError(dimensionName, valueName));
}

export const sampleRouter = new Hono<AppEnv>();

sampleRouter.post('/load', async (c) => {
  const sessionId = c.get('sessionId');
  const db = c.env.DB;

  const [dimensions, policies, tasks] = await Promise.all([
    loadDimensions(db, sessionId),
    loadPolicies(db, sessionId),
    loadTasks(db, sessionId),
  ]);
  if (dimensions.length > 0 || policies.length > 0 || tasks.length > 0) {
    throw new ApiConflictError(API_MESSAGES.sampleAlreadyLoaded);
  }

  const fixture = loadSampleOrgFixture();

  const dimensionIdByName = new Map<string, number>();
  const valueIdByKey = new Map<string, number>();

  for (const dim of fixture.dimensions) {
    const dimensionId = await insertDimension(db, sessionId, dim.name, dim.displayOrder);
    dimensionIdByName.set(dim.name, dimensionId);
    let order = 1;
    for (const valueName of dim.values) {
      const valueId = await insertValue(db, sessionId, dimensionId, valueName, order);
      valueIdByKey.set(`${dim.name}::${valueName}`, valueId);
      order += 1;
    }
  }

  function resolveSelectorOrPosition(entries: Readonly<Record<string, string>>): Record<number, number> {
    const resolved: Record<number, number> = {};
    for (const [dimensionName, valueName] of Object.entries(entries)) {
      const dimensionId = dimensionIdByName.get(dimensionName);
      const valueId = valueIdByKey.get(`${dimensionName}::${valueName}`);
      if (dimensionId === undefined || valueId === undefined) {
        throw fixtureInconsistencyError(dimensionName, valueName);
      }
      resolved[dimensionId] = valueId;
    }
    return resolved;
  }

  for (const policy of fixture.policies) {
    await insertPolicy(db, sessionId, {
      name: policy.name,
      priority: policy.priority,
      selector: resolveSelectorOrPosition(policy.selector),
      allowedRegions: policy.constraints?.allowedRegions,
      allowedProviders: policy.constraints?.allowedProviders,
      bannedModels: policy.constraints?.bannedModels,
      requireLocal: policy.constraints?.requireLocal,
      maxCostPerRun: policy.constraints?.maxCostPerRun,
      weightQuality: policy.weights?.quality,
      weightCost: policy.weights?.cost,
      weightLatency: policy.weights?.latency,
    });
  }

  for (const task of fixture.tasks) {
    await insertTask(db, sessionId, {
      name: task.name,
      taskKind: task.taskKind,
      difficulty: task.difficulty,
      sensitivity: task.sensitivity,
      inputTokens: task.inputTokens,
      outputTokens: task.outputTokens,
      latencyNeed: task.latencyNeed,
      needsImage: task.needsImage,
      monthlyRuns: task.monthlyRuns,
      position: resolveSelectorOrPosition(task.position),
    });
  }

  console.log(
    `[sample] loaded session_id=${sessionId} dimensions=${fixture.dimensions.length} policies=${fixture.policies.length} tasks=${fixture.tasks.length}`,
  );

  const outcome = await recomputeSession(db, sessionId, 'sample_load', new Date());

  return c.json(
    {
      loaded: true,
      dimensionCount: fixture.dimensions.length,
      policyCount: fixture.policies.length,
      taskCount: fixture.tasks.length,
      changeImpactCount: outcome.changeImpacts.length,
    },
    201,
  );
});
