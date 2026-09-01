/**
 * requirements.md 4.9・4.10節に対応する型定義。
 *
 * packages/router-core は外部I/O（DB・HTTP）を一切持たない純粋ロジックのみで構成する。
 * ここに定義する型は、アプリケーション層（apps/api）がDBの行から組み立てて渡す
 * ドメインオブジェクトの形を表す。IDの型はDBスキーマ（db/schema.sql）の主キーに揃える。
 */

// --- ID ---

export type DimensionId = number;
export type ValueId = number;
export type PolicyId = number;
export type TaskId = number;
export type ModelId = string;

// --- 値域（requirements.md 3.5節・5章） ---

export type TaskKind =
  | 'summarize'
  | 'translate'
  | 'classify'
  | 'extract'
  | 'codegen'
  | 'dialogue'
  | 'reasoning';

export type Difficulty = 'low' | 'medium' | 'high';

export type Sensitivity = 'public' | 'internal' | 'confidential' | 'personal';

export type LatencyNeed = 'interactive' | 'batch';

export type Region = 'JP' | 'US' | 'EU';

export type Deployment = 'cloud' | 'local';

export type LatencyClass = 'fast' | 'standard' | 'slow';

export type PolicyStatus = 'active' | 'disabled';

export type AssignmentStatus = 'assigned' | 'unassigned' | 'pinned' | 'pin_violated';

export type ChangeKind = 'dimension' | 'policy' | 'task' | 'model_override' | 'sample_load';

// --- 次元・組織座標（3.1節） ---

export interface DimensionValue {
  readonly id: ValueId;
  readonly dimensionId: DimensionId;
  readonly name: string;
  readonly displayOrder: number;
}

export interface Dimension {
  readonly id: DimensionId;
  readonly name: string;
  readonly displayOrder: number;
  readonly values: readonly DimensionValue[];
}

/**
 * 組織座標。次元ID→値IDのマップ。次元IDが存在しないキーは「未設定」を意味する。
 */
export type Position = Readonly<Record<DimensionId, ValueId>>;

/**
 * セレクタ。次元ID→値IDのマップ。特定の値を指定した次元のみキーを持つ
 * （記載のない次元は任意＝ワイルドカードとして扱う：3.2節）。
 */
export type Selector = Readonly<Record<DimensionId, ValueId>>;

// --- ポリシー（3.3節） ---

/**
 * ポリシー。制約・重みの各項目は未指定（undefined）＝「継承」を意味する。
 */
export interface Policy {
  readonly id: PolicyId;
  readonly name: string;
  readonly status: PolicyStatus;
  readonly priority: number;
  readonly selector: Selector;
  readonly allowedRegions?: readonly Region[];
  readonly allowedProviders?: readonly string[];
  readonly bannedModels?: readonly ModelId[];
  readonly requireLocal?: boolean;
  readonly maxCostPerRun?: number;
  readonly weightQuality?: number;
  readonly weightCost?: number;
  readonly weightLatency?: number;
  readonly disabledReason?: string;
}

export interface Weights {
  readonly quality: number;
  readonly cost: number;
  readonly latency: number;
}

export type ConstraintField =
  | 'allowedRegions'
  | 'allowedProviders'
  | 'bannedModels'
  | 'requireLocal'
  | 'maxCostPerRun';

/**
 * 合成後の有効制約。null は「制限なし」を意味する
 * （allowedRegions・allowedProviders のみnullを取り得る。それ以外は既定値を持つ）。
 */
export interface Constraints {
  readonly allowedRegions: ReadonlySet<Region> | null;
  readonly allowedProviders: ReadonlySet<string> | null;
  readonly bannedModels: ReadonlySet<ModelId>;
  readonly requireLocal: boolean;
  readonly maxCostPerRun: number | null;
  readonly conflict: boolean;
}

/**
 * 許可リージョン・許可プロバイダの積集合が空になった箇所の記録
 * （4.2節手順4：「空にした2つのポリシー」）。
 */
export interface ConstraintConflict {
  readonly field: 'allowedRegions' | 'allowedProviders';
  readonly priorPolicyId: PolicyId | null;
  readonly causingPolicyId: PolicyId;
}

/** 制約の各項目を実際に狭めたポリシーIDの記録（4.2節手順3）。 */
export interface ConstraintContributors {
  readonly allowedRegions: readonly PolicyId[];
  readonly allowedProviders: readonly PolicyId[];
  readonly bannedModels: readonly PolicyId[];
  readonly requireLocal: readonly PolicyId[];
  readonly maxCostPerRun: readonly PolicyId[];
  readonly conflicts: readonly ConstraintConflict[];
}

export interface EffectivePolicy {
  readonly constraints: Constraints;
  readonly contributors: ConstraintContributors;
  readonly weights: Weights;
  readonly appliedPolicyIds: readonly PolicyId[];
  readonly warnings: readonly ReasonCode[];
}

// --- モデルカタログ（3.4節・5章） ---

export interface Model {
  readonly modelId: ModelId;
  readonly displayName: string;
  readonly provider: string;
  readonly deployment: Deployment;
  /** ローカル稼働のモデルは所在地の概念を持たないため null。 */
  readonly region: Region | null;
  readonly trainingOptOut: boolean;
  readonly zeroRetention: boolean;
  readonly contextLimit: number;
  readonly latencyClass: LatencyClass;
  readonly supportsImage: boolean;
  readonly priceInPer1k: number;
  readonly priceOutPer1k: number;
  readonly capabilities: Readonly<Record<TaskKind, number>>;
}

// --- タスク（3.5節） ---

export interface Task {
  readonly id: TaskId;
  readonly name: string;
  readonly taskKind: TaskKind;
  readonly difficulty: Difficulty;
  readonly sensitivity: Sensitivity;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyNeed: LatencyNeed;
  readonly needsImage: boolean;
  readonly monthlyRuns: number;
  readonly position: Position;
  readonly pinnedModelId: ModelId | null;
}

// --- 理由コード（4.9節） ---

export type ExclusionReasonCode =
  | 'MODEL_UNAVAILABLE'
  | 'POLICY_CONFLICT'
  | 'MODEL_BANNED'
  | 'PROVIDER_NOT_ALLOWED'
  | 'LOCAL_REQUIRED'
  | 'REGION_NOT_ALLOWED'
  | 'SENSITIVITY_TRAINING'
  | 'SENSITIVITY_RETENTION'
  | 'MODALITY_UNSUPPORTED'
  | 'CONTEXT_EXCEEDED'
  | 'CAPABILITY_BELOW_FLOOR'
  | 'COST_OVER_LIMIT';

export type WarningReasonCode = 'WARN_NO_RESIDENCY_POLICY' | 'WARN_POSITION_INCOMPLETE';

export type ReasonCode = ExclusionReasonCode | WarningReasonCode;

// --- 候補評価・採点（4.3・4.4節） ---

export interface CandidateScore {
  readonly quality: number;
  readonly cost: number;
  readonly latency: number;
  readonly total: number;
}

export interface EvaluationRow {
  readonly modelId: ModelId;
  readonly passed: boolean;
  readonly reasonCodes: readonly ExclusionReasonCode[];
  readonly estimatedCost: number;
  /** 合格時のみ得点内訳を持つ（4.3節）。 */
  readonly score: CandidateScore | null;
}

export interface EvaluateCandidatesResult {
  readonly rows: readonly EvaluationRow[];
  /** タスク単位の警告（例：WARN_NO_RESIDENCY_POLICY）。モデル単位ではない。 */
  readonly warnings: readonly WarningReasonCode[];
}

// --- 割当決定（4.5節） ---

export interface RankedCandidate {
  readonly modelId: ModelId;
  readonly rank: number;
  readonly score: CandidateScore;
  readonly estimatedCost: number;
}

export interface Assignment {
  readonly taskId: TaskId;
  readonly status: AssignmentStatus;
  readonly adoptedModelId: ModelId | null;
  /** 次点候補（最大 RUNNER_UP_COUNT 件）。 */
  readonly runnersUp: readonly RankedCandidate[];
  /** 合格モデル全件の順位（固定・固定違反時も参考として保持する：4.5節手順1）。 */
  readonly rankedCandidates: readonly RankedCandidate[];
  readonly estimatedCost: number | null;
  readonly monthlyCost: number | null;
  readonly warnings: readonly WarningReasonCode[];
  /** 状態が pin_violated のときのみ、固定モデルの除外理由を保持する。 */
  readonly pinViolationReasonCodes: readonly ExclusionReasonCode[];
  readonly appliedPolicyIds: readonly PolicyId[];
}

// --- 再計算・変更影響（4.6節） ---

export interface ChangeImpact {
  readonly taskId: TaskId;
  readonly changeKind: ChangeKind;
  readonly beforeModelId: ModelId | null;
  readonly beforeStatus: AssignmentStatus | null;
  readonly afterModelId: ModelId | null;
  readonly afterStatus: AssignmentStatus;
}

// --- 固定割当（4.7節） ---

export interface PinDecision {
  readonly accepted: boolean;
  readonly reasonCodes: readonly ExclusionReasonCode[];
}
