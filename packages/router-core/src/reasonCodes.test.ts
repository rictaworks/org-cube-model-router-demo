import { describe, expect, it } from 'vitest';
import { EXCLUSION_REASON_CODES, WARNING_REASON_CODES } from './reasonCodes.js';

describe('reasonCodes（requirements.md 4.9節）', () => {
  it('除外理由コードは12件である', () => {
    expect(EXCLUSION_REASON_CODES).toHaveLength(12);
  });

  it('除外理由コードは4.9節の内容と一致する', () => {
    expect(EXCLUSION_REASON_CODES).toEqual([
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
  });

  it('警告コードは2件である', () => {
    expect(WARNING_REASON_CODES).toEqual(['WARN_NO_RESIDENCY_POLICY', 'WARN_POSITION_INCOMPLETE']);
  });

  it('除外理由コードと警告コードは重複しない', () => {
    const overlap = EXCLUSION_REASON_CODES.filter((code) =>
      (WARNING_REASON_CODES as readonly string[]).includes(code),
    );
    expect(overlap).toEqual([]);
  });
});
