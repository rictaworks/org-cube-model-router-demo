import type { Policy } from '@org-cube-model-router-demo/router-core';
import { describe, expect, it } from 'vitest';
import { findContributingPolicies } from './reasonCodeContributors.js';

function makePolicy(overrides: Partial<Policy> & { id: number }): Policy {
  return {
    name: `policy-${overrides.id}`,
    status: 'active',
    priority: 0,
    selector: {},
    ...overrides,
  };
}

describe('findContributingPolicies', () => {
  const policies: readonly Policy[] = [
    makePolicy({ id: 1, allowedRegions: ['EU'] }),
    makePolicy({ id: 2, requireLocal: true }),
    makePolicy({ id: 3 }),
  ];

  it('理由コードに関係する制約項目を設定している適用ポリシーのみを返す', () => {
    const result = findContributingPolicies('REGION_NOT_ALLOWED', [1, 2, 3], policies);
    expect(result.map((p) => p.id)).toEqual([1]);
  });

  it('適用ポリシーに含まれていないものは除外する', () => {
    const result = findContributingPolicies('REGION_NOT_ALLOWED', [2, 3], policies);
    expect(result).toEqual([]);
  });

  it('ポリシー由来ではない理由コードは常に空配列を返す', () => {
    const result = findContributingPolicies('CAPABILITY_BELOW_FLOOR', [1, 2, 3], policies);
    expect(result).toEqual([]);
  });

  it('LOCAL_REQUIREDはrequireLocalを設定しているポリシーを返す', () => {
    const result = findContributingPolicies('LOCAL_REQUIRED', [1, 2, 3], policies);
    expect(result.map((p) => p.id)).toEqual([2]);
  });
});
