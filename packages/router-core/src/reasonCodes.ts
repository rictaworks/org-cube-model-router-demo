/**
 * requirements.md 4.9節「理由コード一覧」に対応する定数群。
 */
import type { ExclusionReasonCode, WarningReasonCode } from './types.js';

/** 除外理由コード（4.3節：該当するすべてを記録する）。 */
export const EXCLUSION_REASON_CODES: readonly ExclusionReasonCode[] = Object.freeze([
  'MODEL_UNAVAILABLE',
  'POLICY_CONFLICT',
  'MODEL_BANNED',
  'PROVIDER_NOT_ALLOWED',
  'LOCAL_REQUIRED',
  'REGION_NOT_ALLOWED',
  'SENSITIVITY_TRAINING',
  'SENSITIVITY_RETENTION',
  'MODALITY_UNSUPPORTED',
  'CONTEXT_EXCEEDED',
  'CAPABILITY_BELOW_FLOOR',
  'COST_OVER_LIMIT',
]);

/** 警告コード（除外はしない）。 */
export const WARNING_REASON_CODES: readonly WarningReasonCode[] = Object.freeze([
  'WARN_NO_RESIDENCY_POLICY',
  'WARN_POSITION_INCOMPLETE',
]);
