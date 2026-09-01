import { describe, expect, it } from 'vitest';
import { selectModel } from './assignmentDecider.js';
import { UnknownModelError } from './errors.js';
import type { CandidateScore, EvaluationRow, Task } from './types.js';

function score(total: number, quality = 0.5): CandidateScore {
  return { quality, cost: 0.5, latency: 0.5, total };
}

function passedRow(modelId: string, total: number, estimatedCost: number, quality = 0.5): EvaluationRow {
  return { modelId, passed: true, reasonCodes: [], estimatedCost, score: score(total, quality) };
}

function failedRow(modelId: string, reasonCodes: EvaluationRow['reasonCodes'], estimatedCost = 1): EvaluationRow {
  return { modelId, passed: false, reasonCodes, estimatedCost, score: null };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    name: 'task',
    taskKind: 'summarize',
    difficulty: 'low',
    sensitivity: 'public',
    inputTokens: 100,
    outputTokens: 100,
    latencyNeed: 'batch',
    needsImage: false,
    monthlyRuns: 100,
    position: {},
    pinnedModelId: null,
    ...overrides,
  };
}

describe('selectModel（関数D：requirements.md 4.5節）', () => {
  it('固定が無く合格モデルが0件なら未割当とする', () => {
    const result = selectModel({
      task: task(),
      rows: [failedRow('a', ['MODEL_BANNED'])],
      warnings: [],
      appliedPolicyIds: [],
    });

    expect(result.status).toBe('unassigned');
    expect(result.adoptedModelId).toBeNull();
    expect(result.estimatedCost).toBeNull();
    expect(result.monthlyCost).toBeNull();
    expect(result.runnersUp).toEqual([]);
  });

  it('合格モデルが1件以上なら総合得点降順の先頭を採用する', () => {
    const result = selectModel({
      task: task({ monthlyRuns: 10 }),
      rows: [passedRow('low', 0.5, 3), passedRow('high', 0.9, 5)],
      warnings: [],
      appliedPolicyIds: [1],
    });

    expect(result.status).toBe('assigned');
    expect(result.adoptedModelId).toBe('high');
    expect(result.estimatedCost).toBe(5);
    expect(result.monthlyCost).toBe(50);
    expect(result.appliedPolicyIds).toEqual([1]);
  });

  it('次点候補は最大3件、2位以降の順に並ぶ', () => {
    const rows = [
      passedRow('r1', 0.9, 1),
      passedRow('r2', 0.8, 1),
      passedRow('r3', 0.7, 1),
      passedRow('r4', 0.6, 1),
      passedRow('r5', 0.5, 1),
    ];
    const result = selectModel({ task: task(), rows, warnings: [], appliedPolicyIds: [] });

    expect(result.adoptedModelId).toBe('r1');
    expect(result.runnersUp.map((r) => r.modelId)).toEqual(['r2', 'r3', 'r4']);
    expect(result.runnersUp.map((r) => r.rank)).toEqual([2, 3, 4]);
  });

  it('同点の場合は見積もりコスト昇順で解消する', () => {
    const result = selectModel({
      task: task(),
      rows: [passedRow('expensive', 0.8, 10), passedRow('cheap', 0.8, 2)],
      warnings: [],
      appliedPolicyIds: [],
    });
    expect(result.adoptedModelId).toBe('cheap');
  });

  it('総合得点・コストが同点なら能力（品質得点）降順で解消する', () => {
    const result = selectModel({
      task: task(),
      rows: [passedRow('low-q', 0.8, 5, 0.4), passedRow('high-q', 0.8, 5, 0.8)],
      warnings: [],
      appliedPolicyIds: [],
    });
    expect(result.adoptedModelId).toBe('high-q');
  });

  it('総合得点・コスト・能力も同点ならモデルID昇順で解消する（決定的）', () => {
    const result = selectModel({
      task: task(),
      rows: [passedRow('zeta', 0.8, 5, 0.5), passedRow('alpha', 0.8, 5, 0.5)],
      warnings: [],
      appliedPolicyIds: [],
    });
    expect(result.adoptedModelId).toBe('alpha');
  });

  describe('固定割当がある場合', () => {
    it('固定モデルが合格していれば状態を固定とする', () => {
      const result = selectModel({
        task: task({ pinnedModelId: 'pinned', monthlyRuns: 4 }),
        rows: [passedRow('other', 0.9, 1), passedRow('pinned', 0.5, 3)],
        warnings: [],
        appliedPolicyIds: [],
      });

      expect(result.status).toBe('pinned');
      expect(result.adoptedModelId).toBe('pinned');
      expect(result.estimatedCost).toBe(3);
      expect(result.monthlyCost).toBe(12);
      expect(result.pinViolationReasonCodes).toEqual([]);
      // 採点順位は参考として保持する
      expect(result.rankedCandidates.map((c) => c.modelId)).toEqual(['other', 'pinned']);
    });

    it('固定モデルが除外されていれば固定違反とし、理由コードを保持する', () => {
      const result = selectModel({
        task: task({ pinnedModelId: 'pinned' }),
        rows: [passedRow('other', 0.9, 1), failedRow('pinned', ['MODEL_BANNED', 'COST_OVER_LIMIT'])],
        warnings: [],
        appliedPolicyIds: [],
      });

      expect(result.status).toBe('pin_violated');
      expect(result.adoptedModelId).toBeNull();
      expect(result.estimatedCost).toBeNull();
      expect(result.monthlyCost).toBeNull();
      expect(result.pinViolationReasonCodes).toEqual(['MODEL_BANNED', 'COST_OVER_LIMIT']);
    });

    it('固定モデルの評価行が存在しない場合は例外を送出する（想定外の状態）', () => {
      expect(() =>
        selectModel({
          task: task({ pinnedModelId: 'missing' }),
          rows: [passedRow('other', 0.9, 1)],
          warnings: [],
          appliedPolicyIds: [],
        }),
      ).toThrow(UnknownModelError);
    });
  });

  it('関数B・関数Cからの警告をそのまま割当に含める', () => {
    const result = selectModel({
      task: task(),
      rows: [passedRow('a', 0.5, 1)],
      warnings: ['WARN_NO_RESIDENCY_POLICY'],
      appliedPolicyIds: [],
    });
    expect(result.warnings).toEqual(['WARN_NO_RESIDENCY_POLICY']);
  });
});
