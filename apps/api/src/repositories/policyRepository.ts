/**
 * policies・policy_selectors の D1リポジトリ（F2：requirements.md 3.3節）。
 */
import type { DimensionId, Policy, PolicyId, PolicyStatus, Region, Selector, ValueId } from '@org-cube-model-router-demo/router-core';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError } from '../errors.js';

interface PolicyRow {
  readonly id: number;
  readonly name: string;
  readonly status: string;
  readonly priority: number;
  readonly allowed_regions: string | null;
  readonly allowed_providers: string | null;
  readonly banned_models: string | null;
  readonly require_local: number;
  readonly max_cost_per_run: number | null;
  readonly weight_quality: number | null;
  readonly weight_cost: number | null;
  readonly weight_latency: number | null;
  readonly disabled_reason: string | null;
}

interface PolicySelectorRow {
  readonly policy_id: number;
  readonly dimension_id: number;
  readonly value_id: number;
}

export interface PolicyWriteInput {
  readonly name: string;
  readonly priority: number;
  readonly selector: Selector;
  readonly allowedRegions?: readonly Region[];
  readonly allowedProviders?: readonly string[];
  readonly bannedModels?: readonly string[];
  readonly requireLocal?: boolean;
  readonly maxCostPerRun?: number;
  readonly weightQuality?: number;
  readonly weightCost?: number;
  readonly weightLatency?: number;
}

function toPolicy(row: PolicyRow, selector: Selector): Policy {
  return {
    id: row.id,
    name: row.name,
    status: row.status as PolicyStatus,
    priority: row.priority,
    selector,
    allowedRegions: row.allowed_regions === null ? undefined : (JSON.parse(row.allowed_regions) as Region[]),
    allowedProviders: row.allowed_providers === null ? undefined : (JSON.parse(row.allowed_providers) as string[]),
    bannedModels: row.banned_models === null ? undefined : (JSON.parse(row.banned_models) as string[]),
    requireLocal: row.require_local === 1 ? true : undefined,
    maxCostPerRun: row.max_cost_per_run ?? undefined,
    weightQuality: row.weight_quality ?? undefined,
    weightCost: row.weight_cost ?? undefined,
    weightLatency: row.weight_latency ?? undefined,
    disabledReason: row.disabled_reason ?? undefined,
  };
}

export async function loadPolicies(db: D1Database, sessionId: string): Promise<readonly Policy[]> {
  const [policiesResult, selectorsResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, status, priority, allowed_regions, allowed_providers, banned_models, require_local,
                max_cost_per_run, weight_quality, weight_cost, weight_latency, disabled_reason
         FROM policies WHERE session_id = ?1 ORDER BY id`,
      )
      .bind(sessionId)
      .all<PolicyRow>(),
    db
      .prepare(
        `SELECT ps.policy_id AS policy_id, ps.dimension_id AS dimension_id, ps.value_id AS value_id
         FROM policy_selectors ps
         INNER JOIN policies p ON p.id = ps.policy_id
         WHERE p.session_id = ?1`,
      )
      .bind(sessionId)
      .all<PolicySelectorRow>(),
  ]);

  const selectorByPolicy = new Map<number, Record<DimensionId, ValueId>>();
  for (const row of selectorsResult.results) {
    const selector = selectorByPolicy.get(row.policy_id) ?? {};
    selector[row.dimension_id] = row.value_id;
    selectorByPolicy.set(row.policy_id, selector);
  }

  return policiesResult.results.map((row) => toPolicy(row, selectorByPolicy.get(row.id) ?? {}));
}

export async function policyCount(db: D1Database, sessionId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM policies WHERE session_id = ?1')
    .bind(sessionId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

function serializeStringArray(values: readonly string[] | undefined): string | null {
  return values === undefined ? null : JSON.stringify(values);
}

async function replaceSelectors(db: D1Database, policyId: PolicyId, selector: Selector): Promise<void> {
  const statements = [
    db.prepare('DELETE FROM policy_selectors WHERE policy_id = ?1').bind(policyId),
    ...Object.entries(selector).map(([dimensionId, valueId]) =>
      db
        .prepare('INSERT INTO policy_selectors (policy_id, dimension_id, value_id) VALUES (?1, ?2, ?3)')
        .bind(policyId, Number(dimensionId), valueId),
    ),
  ];
  await db.batch(statements);
}

export async function insertPolicy(db: D1Database, sessionId: string, input: PolicyWriteInput): Promise<PolicyId> {
  const result = await db
    .prepare(
      `INSERT INTO policies
         (session_id, name, status, priority, allowed_regions, allowed_providers, banned_models, require_local,
          max_cost_per_run, weight_quality, weight_cost, weight_latency, disabled_reason)
       VALUES (?1, ?2, 'active', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NULL)`,
    )
    .bind(
      sessionId,
      input.name,
      input.priority,
      serializeStringArray(input.allowedRegions),
      serializeStringArray(input.allowedProviders),
      serializeStringArray(input.bannedModels),
      input.requireLocal === true ? 1 : 0,
      input.maxCostPerRun ?? null,
      input.weightQuality ?? null,
      input.weightCost ?? null,
      input.weightLatency ?? null,
    )
    .run();
  const policyId = result.meta.last_row_id;
  await replaceSelectors(db, policyId, input.selector);
  return policyId;
}

/**
 * ポリシーを更新する。無効化されていたポリシーのセレクタを編集した場合は
 * 再有効化する（requirements.md 11.2節：DISABLED --> ACTIVE：セレクタを編集して再有効化）。
 * 多層防御として `session_id` でも絞り込み、影響行数が0件（自セッションが所有する
 * ポリシーでなかった）の場合は例外を投げる（CLAUDE.md「フォールバック禁止」）。
 */
export async function updatePolicy(
  db: D1Database,
  sessionId: string,
  policyId: PolicyId,
  input: PolicyWriteInput,
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE policies SET
         name = ?1, priority = ?2, allowed_regions = ?3, allowed_providers = ?4, banned_models = ?5,
         require_local = ?6, max_cost_per_run = ?7, weight_quality = ?8, weight_cost = ?9, weight_latency = ?10,
         status = 'active', disabled_reason = NULL
       WHERE id = ?11 AND session_id = ?12`,
    )
    .bind(
      input.name,
      input.priority,
      serializeStringArray(input.allowedRegions),
      serializeStringArray(input.allowedProviders),
      serializeStringArray(input.bannedModels),
      input.requireLocal === true ? 1 : 0,
      input.maxCostPerRun ?? null,
      input.weightQuality ?? null,
      input.weightCost ?? null,
      input.weightLatency ?? null,
      policyId,
      sessionId,
    )
    .run();
  if (result.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.policyNotFound);
  }
  await replaceSelectors(db, policyId, input.selector);
}

/**
 * ポリシーを削除する。policy_selectors は自身に session_id 列を持たないため、
 * 対象の policy_id が自セッションの policies 行に属することを EXISTS 句で確認した
 * うえで削除する（多層防御）。最後に policies 本体の削除件数を確認し、0件
 * （自セッションが所有するポリシーでなかった）なら例外を投げる。
 */
export async function deletePolicy(db: D1Database, sessionId: string, policyId: PolicyId): Promise<void> {
  const results = await db.batch([
    db
      .prepare(
        `DELETE FROM policy_selectors
         WHERE policy_id = ?1
           AND EXISTS (SELECT 1 FROM policies p WHERE p.id = ?1 AND p.session_id = ?2)`,
      )
      .bind(policyId, sessionId),
    db.prepare('DELETE FROM policies WHERE id = ?1 AND session_id = ?2').bind(policyId, sessionId),
  ]);

  const policyDeleteResult = results[results.length - 1];
  if (policyDeleteResult === undefined || policyDeleteResult.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.policyNotFound);
  }
}

export async function findPolicyId(db: D1Database, sessionId: string, policyId: PolicyId): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM policies WHERE id = ?1 AND session_id = ?2')
    .bind(policyId, sessionId)
    .first();
  return row !== null;
}
