/**
 * 関数D：割当決定（selectModel）。requirements.md 4.5節。
 */
import { RUNNER_UP_COUNT } from './constants.js';
import { UnknownModelError } from './errors.js';
import type { Assignment, EvaluationRow, PolicyId, RankedCandidate, Task, WarningReasonCode } from './types.js';

export interface SelectModelInput {
  readonly task: Task;
  /** 関数Cの評価行一覧（合格・除外の両方を含む）。 */
  readonly rows: readonly EvaluationRow[];
  /** 関数B・関数Cで生じた警告（そのまま割当に含める：4.5節手順6）。 */
  readonly warnings: readonly WarningReasonCode[];
  readonly appliedPolicyIds: readonly PolicyId[];
}

function compareCandidates(a: EvaluationRow, b: EvaluationRow): number {
  // 呼び出し前提：a, b はともに合格行であり score を持つ。
  const totalDiff = (b.score?.total ?? 0) - (a.score?.total ?? 0);
  if (totalDiff !== 0) {
    return totalDiff;
  }
  const costDiff = a.estimatedCost - b.estimatedCost;
  if (costDiff !== 0) {
    return costDiff;
  }
  const qualityDiff = (b.score?.quality ?? 0) - (a.score?.quality ?? 0);
  if (qualityDiff !== 0) {
    return qualityDiff;
  }
  return a.modelId.localeCompare(b.modelId);
}

function toRankedCandidates(sortedPassedRows: readonly EvaluationRow[]): readonly RankedCandidate[] {
  return sortedPassedRows.map((row, index) => ({
    modelId: row.modelId,
    rank: index + 1,
    // sortedPassedRows は合格行のみのため score は必ず存在する。
    score: row.score ?? { quality: 0, cost: 0, latency: 0, total: 0 },
    estimatedCost: row.estimatedCost,
  }));
}

export function selectModel(input: SelectModelInput): Assignment {
  const { task, rows, warnings, appliedPolicyIds } = input;

  const sortedPassedRows = rows.filter((r) => r.passed).sort(compareCandidates);
  const rankedCandidates = toRankedCandidates(sortedPassedRows);

  if (task.pinnedModelId !== null) {
    const pinnedRow = rows.find((r) => r.modelId === task.pinnedModelId);
    if (pinnedRow === undefined) {
      throw new UnknownModelError(task.pinnedModelId);
    }

    if (pinnedRow.passed) {
      return {
        taskId: task.id,
        status: 'pinned',
        adoptedModelId: pinnedRow.modelId,
        runnersUp: [],
        rankedCandidates,
        estimatedCost: pinnedRow.estimatedCost,
        monthlyCost: pinnedRow.estimatedCost * task.monthlyRuns,
        warnings,
        pinViolationReasonCodes: [],
        appliedPolicyIds,
      };
    }

    return {
      taskId: task.id,
      status: 'pin_violated',
      adoptedModelId: null,
      runnersUp: [],
      rankedCandidates,
      estimatedCost: null,
      monthlyCost: null,
      warnings,
      pinViolationReasonCodes: pinnedRow.reasonCodes,
      appliedPolicyIds,
    };
  }

  if (sortedPassedRows.length === 0) {
    return {
      taskId: task.id,
      status: 'unassigned',
      adoptedModelId: null,
      runnersUp: [],
      rankedCandidates,
      estimatedCost: null,
      monthlyCost: null,
      warnings,
      pinViolationReasonCodes: [],
      appliedPolicyIds,
    };
  }

  const adopted = sortedPassedRows[0];
  if (adopted === undefined) {
    // sortedPassedRows.length > 0 が保証されているため到達しない。
    throw new UnknownModelError('(none)');
  }

  return {
    taskId: task.id,
    status: 'assigned',
    adoptedModelId: adopted.modelId,
    runnersUp: rankedCandidates.slice(1, 1 + RUNNER_UP_COUNT),
    rankedCandidates,
    estimatedCost: adopted.estimatedCost,
    monthlyCost: adopted.estimatedCost * task.monthlyRuns,
    warnings,
    pinViolationReasonCodes: [],
    appliedPolicyIds,
  };
}
