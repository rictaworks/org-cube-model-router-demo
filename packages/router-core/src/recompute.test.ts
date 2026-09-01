import { describe, expect, it } from 'vitest';
import { recomputeAll } from './recompute.js';
import type { Assignment, Dimension, Model, Policy, Task } from './types.js';

function task(id: number, overrides: Partial<Task> = {}): Task {
  return {
    id,
    name: `task-${id}`,
    taskKind: 'summarize',
    difficulty: 'low',
    sensitivity: 'public',
    inputTokens: 100,
    outputTokens: 100,
    latencyNeed: 'batch',
    needsImage: false,
    monthlyRuns: 10,
    position: {},
    pinnedModelId: null,
    ...overrides,
  };
}

function model(id: string, overrides: Partial<Model> = {}): Model {
  return {
    modelId: id,
    displayName: id,
    provider: 'ProviderA',
    deployment: 'cloud',
    region: 'JP',
    trainingOptOut: true,
    zeroRetention: true,
    contextLimit: 100000,
    latencyClass: 'fast',
    supportsImage: true,
    priceInPer1k: 1,
    priceOutPer1k: 1,
    capabilities: {
      summarize: 5,
      translate: 5,
      classify: 5,
      extract: 5,
      codegen: 5,
      dialogue: 5,
      reasoning: 5,
    },
    ...overrides,
  };
}

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    taskId: 1,
    status: 'unassigned',
    adoptedModelId: null,
    runnersUp: [],
    rankedCandidates: [],
    estimatedCost: null,
    monthlyCost: null,
    warnings: [],
    pinViolationReasonCodes: [],
    appliedPolicyIds: [],
    ...overrides,
  };
}

const NO_POLICIES: readonly Policy[] = [];
const NO_DIMENSIONS: readonly Dimension[] = [];

describe('recomputeAll（関数E：requirements.md 4.6節）', () => {
  it('新規タスク（変更前の割当が無い）は常に変更影響として記録する（変更前＝なし）', () => {
    const result = recomputeAll({
      tasks: [task(1)],
      dimensions: NO_DIMENSIONS,
      policies: NO_POLICIES,
      catalog: [model('a')],
      unavailableModelIds: new Set(),
      previousAssignments: new Map(),
      changeKind: 'task',
    });

    expect(result.changeImpacts).toHaveLength(1);
    expect(result.changeImpacts[0]).toMatchObject({
      taskId: 1,
      changeKind: 'task',
      beforeModelId: null,
      beforeStatus: null,
      afterModelId: 'a',
      afterStatus: 'assigned',
    });
  });

  it('採用モデル・状態が変わらないタスクは変更影響に含めない', () => {
    const previous = new Map([[1, assignment({ taskId: 1, status: 'assigned', adoptedModelId: 'a' })]]);
    const result = recomputeAll({
      tasks: [task(1)],
      dimensions: NO_DIMENSIONS,
      policies: NO_POLICIES,
      catalog: [model('a')],
      unavailableModelIds: new Set(),
      previousAssignments: previous,
      changeKind: 'policy',
    });

    expect(result.changeImpacts).toEqual([]);
    expect(result.assignments.get(1)?.adoptedModelId).toBe('a');
  });

  it('採用モデルが変わったタスクのみ変更影響として記録する', () => {
    const previous = new Map([
      [1, assignment({ taskId: 1, status: 'assigned', adoptedModelId: 'a' })],
      [2, assignment({ taskId: 2, status: 'assigned', adoptedModelId: 'b' })],
    ]);

    const result = recomputeAll({
      tasks: [task(1), task(2)],
      dimensions: NO_DIMENSIONS,
      policies: [{ id: 1, name: 'ban-a', status: 'active', priority: 0, selector: {}, bannedModels: ['a'] }],
      catalog: [model('a'), model('b')],
      unavailableModelIds: new Set(),
      previousAssignments: previous,
      changeKind: 'policy',
    });

    expect(result.changeImpacts).toHaveLength(1);
    expect(result.changeImpacts[0]?.taskId).toBe(1);
    expect(result.changeImpacts[0]?.beforeModelId).toBe('a');
    expect(result.changeImpacts[0]?.afterModelId).toBe('b');
    // タスク2は変わらないため対象外
    expect(result.changeImpacts.some((c) => c.taskId === 2)).toBe(false);
  });

  it('全タスクの評価行・割当を返す', () => {
    const result = recomputeAll({
      tasks: [task(1), task(2)],
      dimensions: NO_DIMENSIONS,
      policies: NO_POLICIES,
      catalog: [model('a')],
      unavailableModelIds: new Set(),
      previousAssignments: new Map(),
      changeKind: 'sample_load',
    });

    expect(result.assignments.size).toBe(2);
    expect(result.evaluationRows.size).toBe(2);
    expect(result.evaluationRows.get(1)).toHaveLength(1);
  });

  it('関数B・関数Cの警告を統合して割当に含める', () => {
    const dimensions: readonly Dimension[] = [{ id: 1, name: '部門', displayOrder: 1, values: [] }];
    const result = recomputeAll({
      tasks: [task(1, { sensitivity: 'personal', position: {} })],
      dimensions,
      policies: NO_POLICIES,
      catalog: [model('a')],
      unavailableModelIds: new Set(),
      previousAssignments: new Map(),
      changeKind: 'task',
    });

    const warnings = result.assignments.get(1)?.warnings ?? [];
    expect(warnings).toContain('WARN_POSITION_INCOMPLETE');
    expect(warnings).toContain('WARN_NO_RESIDENCY_POLICY');
  });
});
