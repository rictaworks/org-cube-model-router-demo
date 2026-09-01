import { describe, expect, it } from 'vitest';
import { evaluateCandidates, scoreCandidates } from './candidateEvaluator.js';
import modelCatalogFixture from '../../../data/model_catalog.json';
import type { Constraints, Model, Task } from './types.js';

function noConstraints(overrides: Partial<Constraints> = {}): Constraints {
  return {
    allowedRegions: null,
    allowedProviders: null,
    bannedModels: new Set(),
    requireLocal: false,
    maxCostPerRun: null,
    conflict: false,
    ...overrides,
  };
}

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    name: 'task',
    taskKind: 'summarize',
    difficulty: 'low',
    sensitivity: 'public',
    inputTokens: 100,
    outputTokens: 100,
    latencyNeed: 'interactive',
    needsImage: false,
    monthlyRuns: 0,
    position: {},
    pinnedModelId: null,
    ...overrides,
  };
}

function baseModel(overrides: Partial<Model> = {}): Model {
  return {
    modelId: 'model-a',
    displayName: 'Model A',
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

const DEFAULT_WEIGHTS = { quality: 0.5, cost: 0.3, latency: 0.2 };

describe('evaluateCandidates（関数C：requirements.md 4.3節）', () => {
  it('制約が無く能力・コンテキストも十分なら合格する', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel()],
      unavailableModelIds: new Set(),
    });

    expect(result.rows[0]?.passed).toBe(true);
    expect(result.rows[0]?.reasonCodes).toEqual([]);
    expect(result.rows[0]?.score).not.toBeNull();
  });

  it('提供停止のモデルはMODEL_UNAVAILABLEで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel()],
      unavailableModelIds: new Set(['model-a']),
    });
    expect(result.rows[0]?.reasonCodes).toContain('MODEL_UNAVAILABLE');
  });

  it('ポリシー矛盾があれば全モデルをPOLICY_CONFLICTで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints({ conflict: true }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ modelId: 'a' }), baseModel({ modelId: 'b' })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows.every((r) => r.reasonCodes.includes('POLICY_CONFLICT'))).toBe(true);
  });

  it('禁止モデルはMODEL_BANNEDで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints({ bannedModels: new Set(['model-a']) }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel()],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('MODEL_BANNED');
  });

  it('許可プロバイダに含まれなければPROVIDER_NOT_ALLOWEDで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints({ allowedProviders: new Set(['OtherProvider']) }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ provider: 'ProviderA' })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('PROVIDER_NOT_ALLOWED');
  });

  it('ローカル必須でクラウド稼働ならLOCAL_REQUIREDで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints({ requireLocal: true }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ deployment: 'cloud' })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('LOCAL_REQUIRED');
  });

  it('ローカル必須でもローカル稼働モデルは除外しない', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints({ requireLocal: true }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ deployment: 'local', region: null })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).not.toContain('LOCAL_REQUIRED');
  });

  it('クラウド稼働でリージョンが許可外ならREGION_NOT_ALLOWEDで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints({ allowedRegions: new Set(['EU']) }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ region: 'US' })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('REGION_NOT_ALLOWED');
  });

  it('ローカル稼働はリージョン制約の判定を免除する', () => {
    const result = evaluateCandidates({
      task: baseTask(),
      constraints: noConstraints({ allowedRegions: new Set(['EU']) }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ deployment: 'local', region: null })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).not.toContain('REGION_NOT_ALLOWED');
  });

  it('社内以上の機密度で学習利用オプトアウト不可ならSENSITIVITY_TRAININGで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask({ sensitivity: 'internal' }),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ trainingOptOut: false })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('SENSITIVITY_TRAINING');
  });

  it('公開タスクは学習利用オプトアウト不可でも除外しない', () => {
    const result = evaluateCandidates({
      task: baseTask({ sensitivity: 'public' }),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ trainingOptOut: false, zeroRetention: false })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toEqual([]);
  });

  it('機密以上でゼロリテンション不可ならSENSITIVITY_RETENTIONで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask({ sensitivity: 'confidential' }),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ zeroRetention: false })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('SENSITIVITY_RETENTION');
  });

  it('個人情報タスクで所在地制約が無ければWARN_NO_RESIDENCY_POLICYを付ける（除外はしない）', () => {
    const result = evaluateCandidates({
      task: baseTask({ sensitivity: 'personal' }),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel()],
      unavailableModelIds: new Set(),
    });
    expect(result.warnings).toContain('WARN_NO_RESIDENCY_POLICY');
    expect(result.rows[0]?.reasonCodes).not.toContain('WARN_NO_RESIDENCY_POLICY' as never);
  });

  it('許可リージョンが設定されていれば個人情報の警告を付けない', () => {
    const result = evaluateCandidates({
      task: baseTask({ sensitivity: 'personal' }),
      constraints: noConstraints({ allowedRegions: new Set(['JP']) }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel()],
      unavailableModelIds: new Set(),
    });
    expect(result.warnings).not.toContain('WARN_NO_RESIDENCY_POLICY');
  });

  it('ローカル必須が設定されていれば個人情報の警告を付けない', () => {
    const result = evaluateCandidates({
      task: baseTask({ sensitivity: 'personal' }),
      constraints: noConstraints({ requireLocal: true }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ deployment: 'local', region: null })],
      unavailableModelIds: new Set(),
    });
    expect(result.warnings).not.toContain('WARN_NO_RESIDENCY_POLICY');
  });

  it('画像入力が必要でモデルが非対応ならMODALITY_UNSUPPORTEDで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask({ needsImage: true }),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ supportsImage: false })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('MODALITY_UNSUPPORTED');
  });

  it('入力×余裕係数＋出力がコンテキスト上限を超えればCONTEXT_EXCEEDEDで除外する', () => {
    const result = evaluateCandidates({
      task: baseTask({ inputTokens: 1000, outputTokens: 1000 }),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ contextLimit: 2000 })], // 1000*1.2+1000=2200 > 2000
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('CONTEXT_EXCEEDED');
  });

  it('難易度に対する能力下限未満ならCAPABILITY_BELOW_FLOORで除外する（低=2）', () => {
    const result = evaluateCandidates({
      task: baseTask({ difficulty: 'low', taskKind: 'codegen' }),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ capabilities: { ...baseModel().capabilities, codegen: 1 } })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toContain('CAPABILITY_BELOW_FLOOR');
  });

  it('1実行あたりコスト上限を超えればCOST_OVER_LIMITで除外し、等しい場合は合格とする', () => {
    const task = baseTask({ inputTokens: 1000, outputTokens: 1000 });
    const model = baseModel({ priceInPer1k: 1, priceOutPer1k: 1 }); // cost = 1*1+1*1=2
    const over = evaluateCandidates({
      task,
      constraints: noConstraints({ maxCostPerRun: 1.99 }),
      weights: DEFAULT_WEIGHTS,
      catalog: [model],
      unavailableModelIds: new Set(),
    });
    expect(over.rows[0]?.reasonCodes).toContain('COST_OVER_LIMIT');
    expect(over.rows[0]?.estimatedCost).toBe(2);

    const equal = evaluateCandidates({
      task,
      constraints: noConstraints({ maxCostPerRun: 2 }),
      weights: DEFAULT_WEIGHTS,
      catalog: [model],
      unavailableModelIds: new Set(),
    });
    expect(equal.rows[0]?.reasonCodes).not.toContain('COST_OVER_LIMIT');
    expect(equal.rows[0]?.passed).toBe(true);
  });

  it('該当するすべての除外理由を記録する（最初の1件で打ち切らない）', () => {
    const result = evaluateCandidates({
      task: baseTask({ sensitivity: 'confidential' }),
      constraints: noConstraints({ bannedModels: new Set(['model-a']) }),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ zeroRetention: false })],
      unavailableModelIds: new Set(),
    });
    expect(result.rows[0]?.reasonCodes).toEqual(
      expect.arrayContaining(['MODEL_BANNED', 'SENSITIVITY_RETENTION']),
    );
    expect(result.rows[0]?.reasonCodes.length).toBeGreaterThanOrEqual(2);
  });

  it('見積もりコストは除外されたモデルについても算出する', () => {
    const result = evaluateCandidates({
      task: baseTask({ inputTokens: 1000, outputTokens: 1000 }),
      constraints: noConstraints(),
      weights: DEFAULT_WEIGHTS,
      catalog: [baseModel({ deployment: 'local', region: null })],
      unavailableModelIds: new Set(['model-a']),
    });
    expect(result.rows[0]?.estimatedCost).toBeGreaterThan(0);
  });

  describe('data/model_catalog.json を用いた統合的な検証', () => {
    const catalogFile = modelCatalogFixture as { models: readonly Model[] };

    it('カタログの全6モデルを評価行として返す', () => {
      const result = evaluateCandidates({
        task: baseTask(),
        constraints: noConstraints(),
        weights: DEFAULT_WEIGHTS,
        catalog: catalogFile.models,
        unavailableModelIds: new Set(),
      });
      expect(result.rows).toHaveLength(6);
    });
  });
});

describe('scoreCandidates（4.4節：得点計算）', () => {
  it('品質得点は能力÷5である', () => {
    const scores = scoreCandidates({
      latencyNeed: 'batch',
      weights: DEFAULT_WEIGHTS,
      candidates: [{ modelId: 'a', capability: 4, estimatedCost: 1, latencyClass: 'fast' }],
    });
    expect(scores.get('a')?.quality).toBeCloseTo(0.8);
  });

  it('合格モデルが1件ならコスト得点は1', () => {
    const scores = scoreCandidates({
      latencyNeed: 'batch',
      weights: DEFAULT_WEIGHTS,
      candidates: [{ modelId: 'a', capability: 5, estimatedCost: 100, latencyClass: 'fast' }],
    });
    expect(scores.get('a')?.cost).toBe(1);
  });

  it('最小・最大コストが等しい場合は全モデルコスト得点1', () => {
    const scores = scoreCandidates({
      latencyNeed: 'batch',
      weights: DEFAULT_WEIGHTS,
      candidates: [
        { modelId: 'a', capability: 5, estimatedCost: 10, latencyClass: 'fast' },
        { modelId: 'b', capability: 3, estimatedCost: 10, latencyClass: 'fast' },
      ],
    });
    expect(scores.get('a')?.cost).toBe(1);
    expect(scores.get('b')?.cost).toBe(1);
  });

  it('コスト得点は最小値と最大値から線形に計算する', () => {
    const scores = scoreCandidates({
      latencyNeed: 'batch',
      weights: DEFAULT_WEIGHTS,
      candidates: [
        { modelId: 'cheap', capability: 5, estimatedCost: 0, latencyClass: 'fast' },
        { modelId: 'mid', capability: 5, estimatedCost: 5, latencyClass: 'fast' },
        { modelId: 'expensive', capability: 5, estimatedCost: 10, latencyClass: 'fast' },
      ],
    });
    expect(scores.get('cheap')?.cost).toBe(1);
    expect(scores.get('mid')?.cost).toBe(0.5);
    expect(scores.get('expensive')?.cost).toBe(0);
  });

  it('対話タスクの速度得点は高速1.0／標準0.6／低速0.0', () => {
    const scores = scoreCandidates({
      latencyNeed: 'interactive',
      weights: DEFAULT_WEIGHTS,
      candidates: [
        { modelId: 'fast', capability: 5, estimatedCost: 1, latencyClass: 'fast' },
        { modelId: 'standard', capability: 5, estimatedCost: 1, latencyClass: 'standard' },
        { modelId: 'slow', capability: 5, estimatedCost: 1, latencyClass: 'slow' },
      ],
    });
    expect(scores.get('fast')?.latency).toBe(1.0);
    expect(scores.get('standard')?.latency).toBe(0.6);
    expect(scores.get('slow')?.latency).toBe(0.0);
  });

  it('バッチタスクは速度クラスによらず速度得点1.0', () => {
    const scores = scoreCandidates({
      latencyNeed: 'batch',
      weights: DEFAULT_WEIGHTS,
      candidates: [{ modelId: 'slow', capability: 5, estimatedCost: 1, latencyClass: 'slow' }],
    });
    expect(scores.get('slow')?.latency).toBe(1.0);
  });

  it('総合得点は重み付き合計である', () => {
    const scores = scoreCandidates({
      latencyNeed: 'interactive',
      weights: { quality: 0.5, cost: 0.3, latency: 0.2 },
      candidates: [{ modelId: 'a', capability: 5, estimatedCost: 10, latencyClass: 'fast' }],
    });
    // quality=1, cost=1（単独）, latency=1 → total = 0.5+0.3+0.2 = 1
    expect(scores.get('a')?.total).toBeCloseTo(1);
  });
});
