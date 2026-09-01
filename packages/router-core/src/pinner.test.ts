import { describe, expect, it } from 'vitest';
import { pinModel } from './pinner.js';
import { UnknownModelError } from './errors.js';
import type { EvaluationRow } from './types.js';

const PASSED_ROW: EvaluationRow = {
  modelId: 'aster-l',
  passed: true,
  reasonCodes: [],
  estimatedCost: 1,
  score: { quality: 1, cost: 1, latency: 1, total: 1 },
};

const FAILED_ROW: EvaluationRow = {
  modelId: 'delta-free',
  passed: false,
  reasonCodes: ['MODEL_BANNED', 'COST_OVER_LIMIT'],
  estimatedCost: 1,
  score: null,
};

describe('pinModel（関数F：requirements.md 4.7節）', () => {
  it('指定モデルが合格していれば固定を受理する', () => {
    const decision = pinModel({ modelId: 'aster-l', evaluationRows: [PASSED_ROW, FAILED_ROW] });
    expect(decision.accepted).toBe(true);
    expect(decision.reasonCodes).toEqual([]);
  });

  it('指定モデルが除外されていれば固定を拒否し、理由コードをすべて提示する', () => {
    const decision = pinModel({ modelId: 'delta-free', evaluationRows: [PASSED_ROW, FAILED_ROW] });
    expect(decision.accepted).toBe(false);
    expect(decision.reasonCodes).toEqual(['MODEL_BANNED', 'COST_OVER_LIMIT']);
  });

  it('評価行に存在しないモデルIDを指定した場合は例外を送出する（想定外の状態）', () => {
    expect(() => pinModel({ modelId: 'unknown-model', evaluationRows: [PASSED_ROW] })).toThrow(UnknownModelError);
  });
});
