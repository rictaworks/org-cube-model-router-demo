/**
 * 関数C：候補評価・採点（evaluateCandidates / scoreCandidates）。
 * requirements.md 4.3節（除外判定）・4.4節（得点計算）。
 *
 * 除外理由は最初の1件で打ち切らず、該当するすべてを記録する（4.3節設計原則）。
 * 安全に関わる条件（所在地・データ取り扱い・能力下限・コスト上限）のみを除外根拠とし、
 * 応答速度は嗜好として得点にのみ反映する。
 */
import { CAPABILITY_FLOOR, CONTEXT_MARGIN_FACTOR } from './constants.js';
import type {
  CandidateScore,
  Constraints,
  EvaluateCandidatesResult,
  EvaluationRow,
  ExclusionReasonCode,
  LatencyClass,
  LatencyNeed,
  Model,
  ModelId,
  Task,
  Weights,
} from './types.js';

export interface EvaluateCandidatesInput {
  readonly task: Task;
  readonly constraints: Constraints;
  readonly weights: Weights;
  readonly catalog: readonly Model[];
  /** セッション内で提供停止に設定されているモデルID（4.3節手順1）。 */
  readonly unavailableModelIds: ReadonlySet<ModelId>;
}

function estimateCost(task: Task, model: Model): number {
  return (task.inputTokens / 1000) * model.priceInPer1k + (task.outputTokens / 1000) * model.priceOutPer1k;
}

function collectReasonCodes(task: Task, model: Model, constraints: Constraints, unavailableModelIds: ReadonlySet<ModelId>, estimatedCost: number): ExclusionReasonCode[] {
  const reasons: ExclusionReasonCode[] = [];

  // 1. 提供停止
  if (unavailableModelIds.has(model.modelId)) {
    reasons.push('MODEL_UNAVAILABLE');
  }
  // 2. ポリシー矛盾（全モデル除外）
  if (constraints.conflict) {
    reasons.push('POLICY_CONFLICT');
  }
  // 3. 禁止モデル
  if (constraints.bannedModels.has(model.modelId)) {
    reasons.push('MODEL_BANNED');
  }
  // 4. 許可プロバイダ
  if (constraints.allowedProviders !== null && !constraints.allowedProviders.has(model.provider)) {
    reasons.push('PROVIDER_NOT_ALLOWED');
  }
  // 5. ローカル必須
  if (constraints.requireLocal && model.deployment !== 'local') {
    reasons.push('LOCAL_REQUIRED');
  }
  // 6. 許可リージョン（ローカルは免除）
  if (
    model.deployment === 'cloud' &&
    constraints.allowedRegions !== null &&
    (model.region === null || !constraints.allowedRegions.has(model.region))
  ) {
    reasons.push('REGION_NOT_ALLOWED');
  }
  // 7. データ取り扱い要件
  if (task.sensitivity !== 'public' && !model.trainingOptOut) {
    reasons.push('SENSITIVITY_TRAINING');
  }
  if ((task.sensitivity === 'confidential' || task.sensitivity === 'personal') && !model.zeroRetention) {
    reasons.push('SENSITIVITY_RETENTION');
  }
  // 8. モダリティ
  if (task.needsImage && !model.supportsImage) {
    reasons.push('MODALITY_UNSUPPORTED');
  }
  // 9. コンテキスト上限
  const contextUsage = task.inputTokens * CONTEXT_MARGIN_FACTOR + task.outputTokens;
  if (contextUsage > model.contextLimit) {
    reasons.push('CONTEXT_EXCEEDED');
  }
  // 10. 能力下限
  const capabilityFloor = CAPABILITY_FLOOR[task.difficulty];
  if (model.capabilities[task.taskKind] < capabilityFloor) {
    reasons.push('CAPABILITY_BELOW_FLOOR');
  }
  // 11. コスト上限（等しい場合は合格）
  if (constraints.maxCostPerRun !== null && estimatedCost > constraints.maxCostPerRun) {
    reasons.push('COST_OVER_LIMIT');
  }

  return reasons;
}

function hasResidencyConstraint(constraints: Constraints): boolean {
  return constraints.allowedRegions !== null || constraints.requireLocal;
}

export interface ScoreCandidateInput {
  readonly modelId: ModelId;
  readonly capability: number;
  readonly estimatedCost: number;
  readonly latencyClass: LatencyClass;
}

export interface ScoreCandidatesInput {
  readonly latencyNeed: LatencyNeed;
  readonly weights: Weights;
  /** 合格モデルの集合（4.4節：得点計算は合格モデルの集合を対象とする）。 */
  readonly candidates: readonly ScoreCandidateInput[];
}

function latencyScore(latencyNeed: LatencyNeed, latencyClass: LatencyClass): number {
  if (latencyNeed === 'batch') {
    return 1.0;
  }
  if (latencyClass === 'fast') {
    return 1.0;
  }
  if (latencyClass === 'standard') {
    return 0.6;
  }
  return 0.0;
}

/** 4.4節：得点計算（scoreCandidate）。合格モデルの集合を対象に得点内訳を算出する。 */
export function scoreCandidates(input: ScoreCandidatesInput): ReadonlyMap<ModelId, CandidateScore> {
  const result = new Map<ModelId, CandidateScore>();
  if (input.candidates.length === 0) {
    return result;
  }

  const costs = input.candidates.map((c) => c.estimatedCost);
  const min = Math.min(...costs);
  const max = Math.max(...costs);
  const costRangeIsDegenerate = input.candidates.length === 1 || max === min;

  for (const candidate of input.candidates) {
    const quality = candidate.capability / 5;
    const cost = costRangeIsDegenerate ? 1 : 1 - (candidate.estimatedCost - min) / (max - min);
    const latency = latencyScore(input.latencyNeed, candidate.latencyClass);
    const total = input.weights.quality * quality + input.weights.cost * cost + input.weights.latency * latency;
    result.set(candidate.modelId, { quality, cost, latency, total });
  }

  return result;
}

/** 4.3節：候補評価（evaluateCandidates）。 */
export function evaluateCandidates(input: EvaluateCandidatesInput): EvaluateCandidatesResult {
  const { task, constraints, weights, catalog, unavailableModelIds } = input;

  const evaluated = catalog.map((model) => {
    const estimatedCost = estimateCost(task, model);
    const reasonCodes = collectReasonCodes(task, model, constraints, unavailableModelIds, estimatedCost);
    return { model, estimatedCost, reasonCodes, passed: reasonCodes.length === 0 };
  });

  const scoreInputs: ScoreCandidateInput[] = evaluated
    .filter((e) => e.passed)
    .map((e) => ({
      modelId: e.model.modelId,
      capability: e.model.capabilities[task.taskKind],
      estimatedCost: e.estimatedCost,
      latencyClass: e.model.latencyClass,
    }));
  const scores = scoreCandidates({ latencyNeed: task.latencyNeed, weights, candidates: scoreInputs });

  const rows: EvaluationRow[] = evaluated.map((e) => ({
    modelId: e.model.modelId,
    passed: e.passed,
    reasonCodes: e.reasonCodes,
    estimatedCost: e.estimatedCost,
    score: scores.get(e.model.modelId) ?? null,
  }));

  const warnings = task.sensitivity === 'personal' && !hasResidencyConstraint(constraints)
    ? (['WARN_NO_RESIDENCY_POLICY'] as const)
    : ([] as const);

  return { rows, warnings: [...warnings] };
}
