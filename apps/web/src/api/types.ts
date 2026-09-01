/**
 * apps/api のレスポンス形状の型定義。ドメイン型（Dimension・Policy・Task・Model等）は
 * packages/router-core を再利用し（DRY・割当ロジックの重複実装禁止）、ここでは
 * apps/api のHTTP層固有の形（apps/api/src/routes・repositories を正として書き起こす）
 * のみを定義する。
 */
import type {
  AssignmentStatus,
  ChangeKind,
  Dimension,
  DimensionId,
  DimensionValue,
  ExclusionReasonCode,
  Model,
  ModelId,
  Policy,
  PolicyId,
  RankedCandidate,
  Selector,
  TaskId,
  ValueId,
  WarningReasonCode,
  Weights,
} from '@org-cube-model-router-demo/router-core';

// --- F1 次元管理 ---

export interface DimensionsResponse {
  readonly dimensions: readonly Dimension[];
}

export interface DimensionWriteResponse {
  readonly dimension: { readonly id: DimensionId; readonly name: string; readonly displayOrder?: number; readonly values?: readonly DimensionValue[] };
}

export interface DimensionImpactResponse {
  readonly affectedTaskCount: number;
  readonly affectedPolicyIds: readonly PolicyId[];
}

export interface DimensionDeleteResponse extends DimensionImpactResponse {
  readonly changeImpactCount: number;
}

export interface ValueWriteResponse {
  readonly value: { readonly id: ValueId; readonly dimensionId: DimensionId; readonly name: string; readonly displayOrder?: number };
}

export interface DeletedResponse {
  readonly deleted: true;
}

// --- F2 ポリシー管理 ---

export interface PoliciesResponse {
  readonly policies: readonly Policy[];
}

export interface PolicyWriteResponse {
  readonly policy: Policy;
}

/** PATCH/POSTリクエストのボディ（apps/api/src/routes/policies.ts の parsePolicyInput が受理する形）。 */
export interface PolicyInputPayload {
  readonly name: string;
  readonly priority: number;
  readonly selector: Selector;
  readonly allowedRegions?: readonly string[];
  readonly allowedProviders?: readonly string[];
  readonly bannedModels?: readonly string[];
  readonly requireLocal?: boolean;
  readonly maxCostPerRun?: number;
  readonly weightQuality?: number;
  readonly weightCost?: number;
  readonly weightLatency?: number;
}

// --- F3 タスク管理 ---

export interface TaskPayload {
  readonly id: TaskId;
  readonly name: string;
  readonly taskKind: string;
  readonly difficulty: string;
  readonly sensitivity: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyNeed: string;
  readonly needsImage: boolean;
  readonly monthlyRuns: number;
  readonly position: Selector;
  readonly pinnedModelId: ModelId | null;
}

export interface TasksResponse {
  readonly tasks: readonly TaskPayload[];
}

export interface TaskWriteResponse {
  readonly task: TaskPayload;
}

export interface TaskInputPayload {
  readonly name: string;
  readonly taskKind: string;
  readonly difficulty: string;
  readonly sensitivity: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyNeed: string;
  readonly needsImage: boolean;
  readonly monthlyRuns: number;
  readonly position: Selector;
}

// --- F4 モデルカタログ ---

export interface ModelWithAvailability extends Model {
  readonly unavailable: boolean;
}

export interface ModelsResponse {
  readonly models: readonly ModelWithAvailability[];
}

export interface ModelToggleResponse {
  readonly modelId: ModelId;
  readonly unavailable: boolean;
}

// --- F5 割当結果一覧 ---

export interface AssignmentSummary {
  readonly taskId: TaskId;
  readonly taskName: string;
  readonly status: AssignmentStatus;
  readonly adoptedModelId: ModelId | null;
  readonly estimatedCost: number | null;
  readonly monthlyCost: number | null;
  readonly warnings: readonly WarningReasonCode[];
}

export interface AssignmentsResponse {
  readonly assignments: readonly AssignmentSummary[];
}

// --- F6 根拠表示・F7 固定割当 ---

export interface EffectiveConstraintsJson {
  readonly allowedRegions: readonly string[] | null;
  readonly allowedProviders: readonly string[] | null;
  readonly bannedModels: readonly string[];
  readonly requireLocal: boolean;
  readonly maxCostPerRun: number | null;
  readonly conflict: boolean;
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
  readonly effectiveConstraints: EffectiveConstraintsJson;
  readonly effectiveWeights: Weights;
  readonly appliedPolicyIds: readonly PolicyId[];
  readonly warnings: readonly WarningReasonCode[];
  readonly pinViolationReasonCodes: readonly ExclusionReasonCode[];
  readonly runnersUp: readonly RankedCandidate[];
  readonly candidates: readonly CandidateDetail[];
  readonly computedAt: string;
}

export interface AssignmentDetailResponse {
  readonly assignment: AssignmentDetail;
}

export interface PinRejectedResponse {
  readonly message: string;
  readonly reasonCodes: readonly ExclusionReasonCode[];
}

// --- F8 変更影響 ---

export interface ChangeImpactView {
  readonly id: number;
  readonly changeKind: ChangeKind;
  readonly taskId: TaskId;
  readonly taskName: string;
  readonly beforeModelId: ModelId | null;
  readonly beforeStatus: AssignmentStatus | null;
  readonly afterModelId: ModelId | null;
  readonly afterStatus: AssignmentStatus;
  readonly computedAt: string;
}

export interface ChangeImpactsResponse {
  readonly changeImpacts: readonly ChangeImpactView[];
}

// --- F9 組織ビュー ---

export interface OrgViewCell {
  readonly colValueId: ValueId | null;
  readonly taskCount: number;
  readonly unassignedCount: number;
  readonly pinViolatedCount: number;
  readonly byModel: Readonly<Record<ModelId, number>>;
}

export interface OrgViewRow {
  readonly rowValueId: ValueId | null;
  readonly cells: readonly OrgViewCell[];
}

export interface OrgViewDimensionRef {
  readonly id: DimensionId;
  readonly name: string;
  readonly values: readonly DimensionValue[];
}

export type OrgViewResponse =
  | { readonly mode: 'none'; readonly overall: Omit<OrgViewCell, 'colValueId'> }
  | {
      readonly mode: 'single' | 'cross';
      readonly rowDimension: OrgViewDimensionRef;
      readonly colDimension: OrgViewDimensionRef | null;
      readonly table: readonly OrgViewRow[];
    };

// --- F10 サンプル読込 ---

export interface SampleLoadResponse {
  readonly loaded: true;
  readonly dimensionCount: number;
  readonly policyCount: number;
  readonly taskCount: number;
  readonly changeImpactCount: number;
}
