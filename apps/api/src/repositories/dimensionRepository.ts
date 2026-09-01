/**
 * dimensions・dimension_values の D1リポジトリ（F1：requirements.md 4.1節）。
 * 業務ルールの判定は packages/router-core の manageDimension が行い、ここでは
 * その判定結果に基づく永続化のみを担う。
 */
import type { Dimension, DimensionId, DimensionValue, ValueId } from '@org-cube-model-router-demo/router-core';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError } from '../errors.js';

interface DimensionRow {
  readonly id: number;
  readonly name: string;
  readonly display_order: number;
}

interface DimensionValueRow {
  readonly id: number;
  readonly dimension_id: number;
  readonly name: string;
  readonly display_order: number;
}

export async function loadDimensions(db: D1Database, sessionId: string): Promise<readonly Dimension[]> {
  const [dimensionsResult, valuesResult] = await Promise.all([
    db
      .prepare('SELECT id, name, display_order FROM dimensions WHERE session_id = ?1 ORDER BY display_order, id')
      .bind(sessionId)
      .all<DimensionRow>(),
    db
      .prepare(
        'SELECT id, dimension_id, name, display_order FROM dimension_values WHERE session_id = ?1 ORDER BY dimension_id, display_order, id',
      )
      .bind(sessionId)
      .all<DimensionValueRow>(),
  ]);

  const valuesByDimension = new Map<number, DimensionValue[]>();
  for (const row of valuesResult.results) {
    const list = valuesByDimension.get(row.dimension_id) ?? [];
    list.push({ id: row.id, dimensionId: row.dimension_id, name: row.name, displayOrder: row.display_order });
    valuesByDimension.set(row.dimension_id, list);
  }

  return dimensionsResult.results.map((row) => ({
    id: row.id,
    name: row.name,
    displayOrder: row.display_order,
    values: valuesByDimension.get(row.id) ?? [],
  }));
}

/** 次元を1件挿入し、DBが採番したIDを返す（requirements.md 4.1節手順1〜3）。 */
export async function insertDimension(
  db: D1Database,
  sessionId: string,
  name: string,
  displayOrder: number,
): Promise<DimensionId> {
  const result = await db
    .prepare('INSERT INTO dimensions (session_id, name, display_order) VALUES (?1, ?2, ?3)')
    .bind(sessionId, name, displayOrder)
    .run();
  const id = result.meta.last_row_id;
  return id;
}

/**
 * 次元を改名する。多層防御として `session_id` でも絞り込み、影響行数が0件（自セッション
 * が所有する次元でなかった）の場合は例外を投げる（CLAUDE.md「フォールバック禁止」）。
 */
export async function renameDimension(
  db: D1Database,
  sessionId: string,
  dimensionId: DimensionId,
  name: string,
): Promise<void> {
  const result = await db
    .prepare('UPDATE dimensions SET name = ?1 WHERE id = ?2 AND session_id = ?3')
    .bind(name, dimensionId, sessionId)
    .run();
  if (result.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.dimensionNotFound);
  }
}

export async function insertValue(
  db: D1Database,
  sessionId: string,
  dimensionId: DimensionId,
  name: string,
  displayOrder: number,
): Promise<ValueId> {
  const result = await db
    .prepare('INSERT INTO dimension_values (dimension_id, session_id, name, display_order) VALUES (?1, ?2, ?3, ?4)')
    .bind(dimensionId, sessionId, name, displayOrder)
    .run();
  return result.meta.last_row_id;
}

export async function renameValue(
  db: D1Database,
  sessionId: string,
  valueId: ValueId,
  name: string,
): Promise<void> {
  const result = await db
    .prepare('UPDATE dimension_values SET name = ?1 WHERE id = ?2 AND session_id = ?3')
    .bind(name, valueId, sessionId)
    .run();
  if (result.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.valueNotFound);
  }
}

export async function deleteValue(db: D1Database, sessionId: string, valueId: ValueId): Promise<void> {
  const result = await db
    .prepare('DELETE FROM dimension_values WHERE id = ?1 AND session_id = ?2')
    .bind(valueId, sessionId)
    .run();
  if (result.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.valueNotFound);
  }
}

/**
 * 次元削除の実行（requirements.md 4.1節手順4）。呼び出し側（manageDimension）が
 * 判定した影響を反映したうえで呼ぶこと。
 * 1. 影響を受けるポリシーを無効化
 * 2. 当該次元を参照するpolicy_selectors・task_positions・dimension_valuesを削除
 * 3. dimensions本体を削除
 *
 * policy_selectors・task_positions は自身に session_id 列を持たないため、当該
 * dimension_id が自セッションの dimensions 行に属することを EXISTS 句で確認したうえで
 * 削除する（多層防御）。最後に dimensions 本体の削除件数を確認し、0件（自セッションが
 * 所有する次元でなかった）なら例外を投げる。
 */
export async function deleteDimensionCascade(
  db: D1Database,
  sessionId: string,
  dimensionId: DimensionId,
  disabledPolicyIds: readonly number[],
  disabledReason: string,
): Promise<void> {
  const statements = [
    ...disabledPolicyIds.map((policyId) =>
      db
        .prepare('UPDATE policies SET status = ?1, disabled_reason = ?2 WHERE id = ?3 AND session_id = ?4')
        .bind('disabled', disabledReason, policyId, sessionId),
    ),
    db
      .prepare(
        `DELETE FROM policy_selectors
         WHERE dimension_id = ?1
           AND EXISTS (SELECT 1 FROM dimensions d WHERE d.id = ?1 AND d.session_id = ?2)`,
      )
      .bind(dimensionId, sessionId),
    db
      .prepare(
        `DELETE FROM task_positions
         WHERE dimension_id = ?1
           AND EXISTS (SELECT 1 FROM dimensions d WHERE d.id = ?1 AND d.session_id = ?2)`,
      )
      .bind(dimensionId, sessionId),
    db.prepare('DELETE FROM dimension_values WHERE dimension_id = ?1 AND session_id = ?2').bind(dimensionId, sessionId),
    db.prepare('DELETE FROM dimensions WHERE id = ?1 AND session_id = ?2').bind(dimensionId, sessionId),
  ];
  const results = await db.batch(statements);

  const policyUpdateResults = results.slice(0, disabledPolicyIds.length);
  for (const policyResult of policyUpdateResults) {
    if (policyResult.meta.changes === 0) {
      throw new ApiNotFoundError(API_MESSAGES.policyNotFound);
    }
  }

  const dimensionDeleteResult = results[results.length - 1];
  if (dimensionDeleteResult === undefined || dimensionDeleteResult.meta.changes === 0) {
    throw new ApiNotFoundError(API_MESSAGES.dimensionNotFound);
  }
}
