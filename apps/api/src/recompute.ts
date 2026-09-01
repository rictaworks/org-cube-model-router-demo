/**
 * 再計算のオーケストレーション（requirements.md 4.6節：関数E呼び出し）。
 *
 * ロジック本体（関数B・E）は packages/router-core をそのまま呼び出す。ここでは
 * D1からのロード・関数Eの実行・D1への永続化のみを行い、ポリシー解決・候補評価・
 * 割当決定のアルゴリズムを再実装しない。
 *
 * 補足：関数E（recomputeAll）は割当・評価行・変更影響のみを返し、
 * assignments.effective_constraints_json / effective_weights_json の永続化に必要な
 * EffectivePolicyは返さない。そのため、関数B（resolvePolicy）を関数Eとは別に
 * タスクごとに1回だけ追加で呼び出す（アルゴリズムを重複実装するのではなく、
 * 同じ純粋関数をもう一度呼び出すだけである）。
 */
import { recomputeAll, resolvePolicy } from '@org-cube-model-router-demo/router-core';
import type { ChangeImpact, ChangeKind, EvaluationRow, TaskId } from '@org-cube-model-router-demo/router-core';
import type { Assignment } from '@org-cube-model-router-demo/router-core';
import { loadUnavailableModelIds, loadCatalog } from './repositories/catalogRepository.js';
import { loadDimensions } from './repositories/dimensionRepository.js';
import { loadPolicies } from './repositories/policyRepository.js';
import {
  loadPreviousAssignmentsForRecompute,
  replaceAssignments,
  type EffectivePolicyForPersist,
} from './repositories/assignmentRepository.js';
import { replaceChangeImpacts } from './repositories/changeImpactRepository.js';
import { loadTasks } from './repositories/taskRepository.js';

export interface RecomputeOutcome {
  readonly assignments: ReadonlyMap<TaskId, Assignment>;
  readonly evaluationRows: ReadonlyMap<TaskId, readonly EvaluationRow[]>;
  readonly changeImpacts: readonly ChangeImpact[];
}

/**
 * セッションの全タスクを再計算し、割当・評価行・変更影響をD1へ永続化する
 * （requirements.md 9.1〜9.4節のシーケンス図に対応）。
 */
export async function recomputeSession(
  db: D1Database,
  sessionId: string,
  changeKind: ChangeKind,
  now: Date,
): Promise<RecomputeOutcome> {
  const [dimensions, policies, tasks, catalog, unavailableModelIds, previousAssignments] = await Promise.all([
    loadDimensions(db, sessionId),
    loadPolicies(db, sessionId),
    loadTasks(db, sessionId),
    loadCatalog(db),
    loadUnavailableModelIds(db, sessionId),
    loadPreviousAssignmentsForRecompute(db, sessionId),
  ]);

  const result = recomputeAll({
    tasks,
    dimensions,
    policies,
    catalog,
    unavailableModelIds,
    previousAssignments,
    changeKind,
  });

  const effectivePolicyByTask = new Map<TaskId, EffectivePolicyForPersist>();
  for (const task of tasks) {
    const effective = resolvePolicy({ position: task.position, policies, dimensions });
    effectivePolicyByTask.set(task.id, { constraints: effective.constraints, weights: effective.weights });
  }

  await replaceAssignments(db, sessionId, result, effectivePolicyByTask, now);
  await replaceChangeImpacts(db, sessionId, result.changeImpacts, now);

  return result;
}
