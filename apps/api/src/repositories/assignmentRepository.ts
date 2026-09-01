/**
 * assignments・assignment_candidates の D1リポジトリ（F5・F6：requirements.md 4.5・4.6節）。
 */
import { RUNNER_UP_COUNT } from '@org-cube-model-router-demo/router-core';
import type {
  Assignment,
  AssignmentStatus,
  Constraints,
  EvaluationRow,
  ExclusionReasonCode,
  ModelId,
  PolicyId,
  RankedCandidate,
  TaskId,
  WarningReasonCode,
  Weights,
} from '@org-cube-model-router-demo/router-core';

/** recomputeAllの previousAssignments に渡すための最小限の再構成（status・adoptedModelIdのみ使用）。 */
export async function loadPreviousAssignmentsForRecompute(
  db: D1Database,
  sessionId: string,
): Promise<ReadonlyMap<TaskId, Assignment>> {
  const { results } = await db
    .prepare('SELECT task_id, status, adopted_model_id FROM assignments WHERE session_id = ?1')
    .bind(sessionId)
    .all<{ task_id: number; status: string; adopted_model_id: string | null }>();

  const map = new Map<TaskId, Assignment>();
  for (const row of results) {
    map.set(row.task_id, {
      taskId: row.task_id,
      status: row.status as AssignmentStatus,
      adoptedModelId: row.adopted_model_id,
      runnersUp: [],
      rankedCandidates: [],
      estimatedCost: null,
      monthlyCost: null,
      warnings: [],
      pinViolationReasonCodes: [],
      appliedPolicyIds: [],
    });
  }
  return map;
}

function serializeConstraints(constraints: Constraints): string {
  return JSON.stringify({
    allowedRegions: constraints.allowedRegions === null ? null : [...constraints.allowedRegions],
    allowedProviders: constraints.allowedProviders === null ? null : [...constraints.allowedProviders],
    bannedModels: [...constraints.bannedModels],
    requireLocal: constraints.requireLocal,
    maxCostPerRun: constraints.maxCostPerRun,
    conflict: constraints.conflict,
  });
}

export interface PersistableRecomputeResult {
  readonly assignments: ReadonlyMap<TaskId, Assignment>;
  readonly evaluationRows: ReadonlyMap<TaskId, readonly EvaluationRow[]>;
}

export interface EffectivePolicyForPersist {
  readonly constraints: Constraints;
  readonly weights: Weights;
}

/**
 * 再計算結果をセッション全体で置き換える（requirements.md 6章：
 * 「評価行は再計算のたびに全件置き換える」）。
 */
export async function replaceAssignments(
  db: D1Database,
  sessionId: string,
  result: PersistableRecomputeResult,
  effectivePolicyByTask: ReadonlyMap<TaskId, EffectivePolicyForPersist>,
  now: Date,
): Promise<void> {
  const computedAt = now.toISOString();

  const deleteStatements = [
    db
      .prepare('DELETE FROM assignment_candidates WHERE task_id IN (SELECT id FROM tasks WHERE session_id = ?1)')
      .bind(sessionId),
    db.prepare('DELETE FROM assignments WHERE session_id = ?1').bind(sessionId),
  ];

  const insertStatements: D1PreparedStatement[] = [];

  for (const [taskId, assignment] of result.assignments) {
    const effective = effectivePolicyByTask.get(taskId);
    if (effective === undefined) {
      throw new Error(`効果的ポリシーが見つかりません（内部不整合）: taskId=${taskId}`);
    }

    insertStatements.push(
      db
        .prepare(
          `INSERT INTO assignments
             (task_id, session_id, status, adopted_model_id, estimated_cost, monthly_cost,
              effective_constraints_json, effective_weights_json, applied_policy_ids, warning_codes, computed_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
        )
        .bind(
          taskId,
          sessionId,
          assignment.status,
          assignment.adoptedModelId,
          assignment.estimatedCost,
          assignment.monthlyCost,
          serializeConstraints(effective.constraints),
          JSON.stringify(effective.weights),
          JSON.stringify(assignment.appliedPolicyIds),
          JSON.stringify(assignment.warnings),
          computedAt,
        ),
    );

    const rankByModel = new Map<ModelId, number>(assignment.rankedCandidates.map((c) => [c.modelId, c.rank]));
    const rows = result.evaluationRows.get(taskId) ?? [];
    for (const row of rows) {
      insertStatements.push(
        db
          .prepare(
            `INSERT INTO assignment_candidates
               (task_id, model_id, passed, reason_codes, estimated_cost, score_quality, score_cost, score_latency,
                score_total, rank)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
          )
          .bind(
            taskId,
            row.modelId,
            row.passed ? 1 : 0,
            JSON.stringify(row.reasonCodes),
            row.estimatedCost,
            row.score?.quality ?? null,
            row.score?.cost ?? null,
            row.score?.latency ?? null,
            row.score?.total ?? null,
            rankByModel.get(row.modelId) ?? null,
          ),
      );
    }
  }

  await db.batch([...deleteStatements, ...insertStatements]);
}

export interface AssignmentSummary {
  readonly taskId: TaskId;
  readonly taskName: string;
  readonly status: AssignmentStatus;
  readonly adoptedModelId: ModelId | null;
  readonly estimatedCost: number | null;
  readonly monthlyCost: number | null;
  readonly warnings: readonly WarningReasonCode[];
}

/** F5：セッション内の全タスクの割当一覧。 */
export async function loadAssignmentSummaries(db: D1Database, sessionId: string): Promise<readonly AssignmentSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT a.task_id AS task_id, t.name AS task_name, a.status AS status, a.adopted_model_id AS adopted_model_id,
              a.estimated_cost AS estimated_cost, a.monthly_cost AS monthly_cost, a.warning_codes AS warning_codes
       FROM assignments a
       INNER JOIN tasks t ON t.id = a.task_id
       WHERE a.session_id = ?1
       ORDER BY a.task_id`,
    )
    .bind(sessionId)
    .all<{
      task_id: number;
      task_name: string;
      status: string;
      adopted_model_id: string | null;
      estimated_cost: number | null;
      monthly_cost: number | null;
      warning_codes: string;
    }>();

  return results.map((row) => ({
    taskId: row.task_id,
    taskName: row.task_name,
    status: row.status as AssignmentStatus,
    adoptedModelId: row.adopted_model_id,
    estimatedCost: row.estimated_cost,
    monthlyCost: row.monthly_cost,
    warnings: JSON.parse(row.warning_codes) as WarningReasonCode[],
  }));
}

export interface CandidateDetail {
  readonly modelId: ModelId;
  readonly passed: boolean;
  readonly reasonCodes: readonly ExclusionReasonCode[];
  readonly estimatedCost: number;
  readonly scoreQuality: number | null;
  readonly scoreCost: number | null;
  readonly scoreLatency: number | null;
  readonly scoreTotal: number | null;
  readonly rank: number | null;
}

export interface AssignmentDetail {
  readonly taskId: TaskId;
  readonly status: AssignmentStatus;
  readonly adoptedModelId: ModelId | null;
  readonly estimatedCost: number | null;
  readonly monthlyCost: number | null;
  readonly effectiveConstraints: unknown;
  readonly effectiveWeights: unknown;
  readonly appliedPolicyIds: readonly PolicyId[];
  readonly warnings: readonly WarningReasonCode[];
  readonly pinViolationReasonCodes: readonly ExclusionReasonCode[];
  readonly runnersUp: readonly RankedCandidate[];
  readonly candidates: readonly CandidateDetail[];
  readonly computedAt: string;
}

/** F6：根拠表示のための詳細（得点内訳・次点候補・除外理由・適用ポリシー）。 */
export async function loadAssignmentDetail(
  db: D1Database,
  sessionId: string,
  taskId: TaskId,
): Promise<AssignmentDetail | null> {
  const assignmentRow = await db
    .prepare(
      `SELECT status, adopted_model_id, estimated_cost, monthly_cost, effective_constraints_json,
              effective_weights_json, applied_policy_ids, warning_codes, computed_at
       FROM assignments WHERE task_id = ?1 AND session_id = ?2`,
    )
    .bind(taskId, sessionId)
    .first<{
      status: string;
      adopted_model_id: string | null;
      estimated_cost: number | null;
      monthly_cost: number | null;
      effective_constraints_json: string;
      effective_weights_json: string;
      applied_policy_ids: string;
      warning_codes: string;
      computed_at: string;
    }>();
  if (assignmentRow === null) {
    return null;
  }

  const taskRow = await db
    .prepare('SELECT pinned_model_id FROM tasks WHERE id = ?1 AND session_id = ?2')
    .bind(taskId, sessionId)
    .first<{ pinned_model_id: string | null }>();

  const { results: candidateRows } = await db
    .prepare(
      `SELECT model_id, passed, reason_codes, estimated_cost, score_quality, score_cost, score_latency,
              score_total, rank
       FROM assignment_candidates WHERE task_id = ?1 ORDER BY (rank IS NULL), rank, model_id`,
    )
    .bind(taskId)
    .all<{
      model_id: string;
      passed: number;
      reason_codes: string;
      estimated_cost: number;
      score_quality: number | null;
      score_cost: number | null;
      score_latency: number | null;
      score_total: number | null;
      rank: number | null;
    }>();

  const candidates: CandidateDetail[] = candidateRows.map((row) => ({
    modelId: row.model_id,
    passed: row.passed === 1,
    reasonCodes: JSON.parse(row.reason_codes) as ExclusionReasonCode[],
    estimatedCost: row.estimated_cost,
    scoreQuality: row.score_quality,
    scoreCost: row.score_cost,
    scoreLatency: row.score_latency,
    scoreTotal: row.score_total,
    rank: row.rank,
  }));

  const rankedCandidates: RankedCandidate[] = candidates
    .filter((c) => c.passed && c.rank !== null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((c) => ({
      modelId: c.modelId,
      rank: c.rank as number,
      score: { quality: c.scoreQuality ?? 0, cost: c.scoreCost ?? 0, latency: c.scoreLatency ?? 0, total: c.scoreTotal ?? 0 },
      estimatedCost: c.estimatedCost,
    }));

  const pinnedModelId = taskRow?.pinned_model_id ?? null;
  const pinViolationReasonCodes: readonly ExclusionReasonCode[] =
    assignmentRow.status === 'pin_violated' && pinnedModelId !== null
      ? (candidates.find((c) => c.modelId === pinnedModelId)?.reasonCodes ?? [])
      : [];

  return {
    taskId,
    status: assignmentRow.status as AssignmentStatus,
    adoptedModelId: assignmentRow.adopted_model_id,
    estimatedCost: assignmentRow.estimated_cost,
    monthlyCost: assignmentRow.monthly_cost,
    effectiveConstraints: JSON.parse(assignmentRow.effective_constraints_json),
    effectiveWeights: JSON.parse(assignmentRow.effective_weights_json),
    appliedPolicyIds: JSON.parse(assignmentRow.applied_policy_ids) as PolicyId[],
    warnings: JSON.parse(assignmentRow.warning_codes) as WarningReasonCode[],
    pinViolationReasonCodes,
    // packages/router-core/src/assignmentDecider.ts の selectModel() は、status が
    // 'assigned' の場合のみ runnersUp（採用モデルを除く上位 RUNNER_UP_COUNT 件）を返し、
    // それ以外（pinned・pin_violated・unassigned）は常に [] を返す。ここでの復元も
    // その意味論に厳密に合わせる（採用済みモデルがrunnersUpに混入しないようにする）。
    runnersUp: assignmentRow.status === 'assigned' ? rankedCandidates.slice(1, 1 + RUNNER_UP_COUNT) : [],
    candidates,
    computedAt: assignmentRow.computed_at,
  };
}

/** F7：固定判定に用いる、タスクの最新の評価行。 */
export async function loadEvaluationRows(db: D1Database, taskId: TaskId): Promise<readonly EvaluationRow[]> {
  const { results } = await db
    .prepare(
      `SELECT model_id, passed, reason_codes, estimated_cost, score_quality, score_cost, score_latency, score_total
       FROM assignment_candidates WHERE task_id = ?1`,
    )
    .bind(taskId)
    .all<{
      model_id: string;
      passed: number;
      reason_codes: string;
      estimated_cost: number;
      score_quality: number | null;
      score_cost: number | null;
      score_latency: number | null;
      score_total: number | null;
    }>();

  return results.map((row) => ({
    modelId: row.model_id,
    passed: row.passed === 1,
    reasonCodes: JSON.parse(row.reason_codes) as ExclusionReasonCode[],
    estimatedCost: row.estimated_cost,
    score:
      row.score_quality === null
        ? null
        : { quality: row.score_quality, cost: row.score_cost ?? 0, latency: row.score_latency ?? 0, total: row.score_total ?? 0 },
  }));
}
