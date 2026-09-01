import { describe, expect, it } from 'vitest';
import { resolvePolicy } from './policyResolver.js';
import { DEFAULT_WEIGHTS } from './constants.js';
import type { Dimension, Policy } from './types.js';

function policy(id: number, overrides: Partial<Policy> = {}): Policy {
  return {
    id,
    name: `policy-${id}`,
    status: 'active',
    priority: 0,
    selector: {},
    ...overrides,
  };
}

const DIMENSIONS: readonly Dimension[] = [
  { id: 1, name: '部門', displayOrder: 1, values: [] },
  { id: 2, name: '拠点', displayOrder: 2, values: [] },
];

describe('resolvePolicy（関数B：requirements.md 4.2節）', () => {
  it('一致するポリシーが無ければ既定値を返す', () => {
    const result = resolvePolicy({ position: {}, policies: [], dimensions: [] });

    expect(result.constraints).toEqual({
      allowedRegions: null,
      allowedProviders: null,
      bannedModels: new Set(),
      requireLocal: false,
      maxCostPerRun: null,
      conflict: false,
    });
    expect(result.weights).toEqual(DEFAULT_WEIGHTS);
    expect(result.appliedPolicyIds).toEqual([]);
  });

  it('無効ポリシーは一致判定から除外する', () => {
    const p = policy(1, { selector: {}, status: 'disabled', allowedRegions: ['EU'] });
    const result = resolvePolicy({ position: {}, policies: [p], dimensions: [] });
    expect(result.appliedPolicyIds).toEqual([]);
    expect(result.constraints.allowedRegions).toBeNull();
  });

  it('セレクタが指定する次元の値が一致しなければ適用しない', () => {
    const p = policy(1, { selector: { 1: 10 }, allowedRegions: ['EU'] });
    const result = resolvePolicy({ position: { 1: 20 }, policies: [p], dimensions: DIMENSIONS });
    expect(result.appliedPolicyIds).toEqual([]);
  });

  it('座標が「未設定」の次元は、その次元を任意とするセレクタにのみ一致する', () => {
    const wildcard = policy(1, { selector: {} });
    const specific = policy(2, { selector: { 1: 10 } });
    const result = resolvePolicy({ position: {}, policies: [wildcard, specific], dimensions: DIMENSIONS });
    expect(result.appliedPolicyIds).toEqual([1]);
  });

  it('特異度昇順→優先度昇順→ID昇順で並べ、後の重みが上書きする', () => {
    const broad = policy(3, { selector: {}, priority: 5, weightQuality: 0.5 });
    const narrowLowPriority = policy(1, { selector: { 1: 10 }, priority: 0, weightQuality: 0.6 });
    const narrowHighPriority = policy(2, { selector: { 1: 10 }, priority: 1, weightQuality: 0.7 });

    const result = resolvePolicy({
      position: { 1: 10 },
      policies: [narrowHighPriority, broad, narrowLowPriority],
      dimensions: DIMENSIONS,
    });

    // 特異度0（broad）→特異度1で優先度0（narrowLowPriority）→優先度1（narrowHighPriority）
    expect(result.appliedPolicyIds).toEqual([3, 1, 2]);
    expect(result.weights.quality).toBeCloseTo(0.7 / (0.7 + 0.3 + 0.2));
  });

  it('許可リージョンは積集合で狭める（狭めたポリシーのみ寄与記録）', () => {
    const wide = policy(1, { selector: {}, allowedRegions: ['EU', 'JP'] });
    const narrower = policy(2, { selector: { 1: 10 }, allowedRegions: ['EU'] });
    const result = resolvePolicy({ position: { 1: 10 }, policies: [wide, narrower], dimensions: DIMENSIONS });

    expect(result.constraints.allowedRegions).toEqual(new Set(['EU']));
    expect(result.contributors.allowedRegions).toEqual([1, 2]);
  });

  it('積集合を変えないポリシーは寄与記録しない', () => {
    const narrow = policy(1, { selector: {}, allowedRegions: ['EU'] });
    const sameAgain = policy(2, { selector: { 1: 10 }, allowedRegions: ['EU', 'JP'] });
    const result = resolvePolicy({ position: { 1: 10 }, policies: [narrow, sameAgain], dimensions: DIMENSIONS });

    expect(result.constraints.allowedRegions).toEqual(new Set(['EU']));
    expect(result.contributors.allowedRegions).toEqual([1]);
  });

  it('許可リージョンの積集合が空になった場合、ポリシー矛盾を記録する', () => {
    const eu = policy(1, { selector: {}, allowedRegions: ['EU'] });
    const us = policy(2, { selector: { 1: 10 }, allowedRegions: ['US'] });
    const result = resolvePolicy({ position: { 1: 10 }, policies: [eu, us], dimensions: DIMENSIONS });

    expect(result.constraints.conflict).toBe(true);
    expect(result.constraints.allowedRegions).toEqual(new Set());
    expect(result.contributors.conflicts).toEqual([
      { field: 'allowedRegions', priorPolicyId: 1, causingPolicyId: 2 },
    ]);
  });

  it('許可プロバイダも積集合で狭め、矛盾を検出する', () => {
    const a = policy(1, { selector: {}, allowedProviders: ['Aster'] });
    const b = policy(2, { selector: { 1: 10 }, allowedProviders: ['Boreal'] });
    const result = resolvePolicy({ position: { 1: 10 }, policies: [a, b], dimensions: DIMENSIONS });

    expect(result.constraints.conflict).toBe(true);
    expect(result.contributors.conflicts).toEqual([
      { field: 'allowedProviders', priorPolicyId: 1, causingPolicyId: 2 },
    ]);
  });

  it('禁止モデルは和集合で合成する', () => {
    const a = policy(1, { selector: {}, bannedModels: ['delta-free'] });
    const b = policy(2, { selector: { 1: 10 }, bannedModels: ['delta-free', 'cedar-jp'] });
    const result = resolvePolicy({ position: { 1: 10 }, policies: [a, b], dimensions: DIMENSIONS });

    expect(result.constraints.bannedModels).toEqual(new Set(['delta-free', 'cedar-jp']));
    expect(result.contributors.bannedModels).toEqual([1, 2]);
  });

  it('ローカル必須はいずれかが真なら真になり、明示的なfalseで緩まない', () => {
    const requireTrue = policy(1, { selector: {}, requireLocal: true });
    const explicitFalse = policy(2, { selector: { 1: 10 }, requireLocal: false });
    const result = resolvePolicy({
      position: { 1: 10 },
      policies: [requireTrue, explicitFalse],
      dimensions: DIMENSIONS,
    });

    expect(result.constraints.requireLocal).toBe(true);
    expect(result.contributors.requireLocal).toEqual([1]);
  });

  it('コスト上限は最小値のみを採用し、緩める指定は無視する', () => {
    const strict = policy(1, { selector: {}, maxCostPerRun: 50 });
    const looser = policy(2, { selector: { 1: 10 }, maxCostPerRun: 80 });
    const result = resolvePolicy({ position: { 1: 10 }, policies: [strict, looser], dimensions: DIMENSIONS });

    expect(result.constraints.maxCostPerRun).toBe(50);
    expect(result.contributors.maxCostPerRun).toEqual([1]);
  });

  it('重みの合計が1でなければ正規化する', () => {
    const p = policy(1, { selector: {}, weightQuality: 1, weightCost: 1, weightLatency: 0 });
    const result = resolvePolicy({ position: {}, policies: [p], dimensions: [] });

    expect(result.weights).toEqual({ quality: 0.5, cost: 0.5, latency: 0 });
  });

  it('重みの合計が0であれば既定重みに戻す', () => {
    const p = policy(1, { selector: {}, weightQuality: 0, weightCost: 0, weightLatency: 0 });
    const result = resolvePolicy({ position: {}, policies: [p], dimensions: [] });

    expect(result.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it('組織座標に「未設定」の次元があればWARN_POSITION_INCOMPLETEを付ける', () => {
    const result = resolvePolicy({ position: { 1: 10 }, policies: [], dimensions: DIMENSIONS });
    expect(result.warnings).toContain('WARN_POSITION_INCOMPLETE');
  });

  it('全次元に値がある場合はWARN_POSITION_INCOMPLETEを付けない', () => {
    const result = resolvePolicy({ position: { 1: 10, 2: 20 }, policies: [], dimensions: DIMENSIONS });
    expect(result.warnings).not.toContain('WARN_POSITION_INCOMPLETE');
  });

  it('次元が0個でも全体ポリシーのみを対象に同じ手順を実行する', () => {
    const p = policy(1, { selector: {}, allowedRegions: ['EU'] });
    const result = resolvePolicy({ position: {}, policies: [p], dimensions: [] });
    expect(result.constraints.allowedRegions).toEqual(new Set(['EU']));
    expect(result.warnings).not.toContain('WARN_POSITION_INCOMPLETE');
  });
});
