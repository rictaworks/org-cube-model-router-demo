/**
 * 関数E：再計算と変更影響（recomputeAll）。requirements.md 4.6節。
 *
 * 全タスクについて 関数B（resolvePolicy）→関数C（evaluateCandidates）→
 * 関数D（selectModel）を順に実行し、割当・評価行を置き換える。変更前後で
 * 採用モデルまたは状態が異なるタスクを変更影響として返す
 * （新規タスクは「変更前＝なし」として常に記録する：9.1節）。
 */
import { selectModel } from './assignmentDecider.js';
import { evaluateCandidates } from './candidateEvaluator.js';
import { resolvePolicy } from './policyResolver.js';
import type {
  Assignment,
  ChangeImpact,
  ChangeKind,
  Dimension,
  EvaluationRow,
  Model,
  ModelId,
  Policy,
  Task,
  TaskId,
  WarningReasonCode,
} from './types.js';

export interface RecomputeAllInput {
  readonly tasks: readonly Task[];
  readonly dimensions: readonly Dimension[];
  readonly policies: readonly Policy[];
  readonly catalog: readonly Model[];
  readonly unavailableModelIds: ReadonlySet<ModelId>;
  /** 直前の割当（タスクIDをキーとする）。新規タスクはキーを持たない。 */
  readonly previousAssignments: ReadonlyMap<TaskId, Assignment>;
  readonly changeKind: ChangeKind;
}

export interface RecomputeAllResult {
  readonly assignments: ReadonlyMap<TaskId, Assignment>;
  readonly evaluationRows: ReadonlyMap<TaskId, readonly EvaluationRow[]>;
  /** 直近1回分の変更影響一覧（呼び出し側が既存の一覧を置き換える）。 */
  readonly changeImpacts: readonly ChangeImpact[];
}

function mergeWarnings(
  a: readonly WarningReasonCode[],
  b: readonly WarningReasonCode[],
): readonly WarningReasonCode[] {
  return [...new Set([...a, ...b])];
}

export function recomputeAll(input: RecomputeAllInput): RecomputeAllResult {
  const { tasks, dimensions, policies, catalog, unavailableModelIds, previousAssignments, changeKind } = input;

  const assignments = new Map<TaskId, Assignment>();
  const evaluationRows = new Map<TaskId, readonly EvaluationRow[]>();
  const changeImpacts: ChangeImpact[] = [];

  for (const task of tasks) {
    const effectivePolicy = resolvePolicy({ position: task.position, policies, dimensions });
    const evaluation = evaluateCandidates({
      task,
      constraints: effectivePolicy.constraints,
      weights: effectivePolicy.weights,
      catalog,
      unavailableModelIds,
    });
    const warnings = mergeWarnings(effectivePolicy.warnings, evaluation.warnings);
    const assignment = selectModel({
      task,
      rows: evaluation.rows,
      warnings,
      appliedPolicyIds: effectivePolicy.appliedPolicyIds,
    });

    assignments.set(task.id, assignment);
    evaluationRows.set(task.id, evaluation.rows);

    const before = previousAssignments.get(task.id);
    const changed =
      before === undefined || before.adoptedModelId !== assignment.adoptedModelId || before.status !== assignment.status;
    if (changed) {
      changeImpacts.push({
        taskId: task.id,
        changeKind,
        beforeModelId: before?.adoptedModelId ?? null,
        beforeStatus: before?.status ?? null,
        afterModelId: assignment.adoptedModelId,
        afterStatus: assignment.status,
      });
    }
  }

  return { assignments, evaluationRows, changeImpacts };
}
