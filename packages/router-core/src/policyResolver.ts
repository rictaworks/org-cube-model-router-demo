/**
 * 関数B：有効ポリシー解決（resolvePolicy）。requirements.md 4.2節。
 *
 * 制約は常に「狭める」方向にのみ合成し（3.3節）、重みはより具体的なポリシーが
 * 上書きする。純粋関数であり、DB・HTTPへのアクセスは行わない。
 */
import { DEFAULT_WEIGHTS } from './constants.js';
import type {
  Constraints,
  ConstraintContributors,
  Dimension,
  EffectivePolicy,
  ModelId,
  Policy,
  PolicyId,
  Position,
  Region,
  Weights,
} from './types.js';

export interface ResolvePolicyInput {
  readonly position: Position;
  readonly policies: readonly Policy[];
  readonly dimensions: readonly Dimension[];
}

function selectorMatches(selector: Policy['selector'], position: Position): boolean {
  return Object.entries(selector).every(([dimensionId, valueId]) => position[Number(dimensionId)] === valueId);
}

function specificity(policy: Policy): number {
  return Object.keys(policy.selector).length;
}

function sortMatchedPolicies(policies: readonly Policy[]): readonly Policy[] {
  return [...policies].sort((a, b) => {
    const specificityDiff = specificity(a) - specificity(b);
    if (specificityDiff !== 0) {
      return specificityDiff;
    }
    const priorityDiff = a.priority - b.priority;
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.id - b.id;
  });
}

function setEquals<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}

interface SetFieldState<T> {
  current: ReadonlySet<T> | null;
  makerPolicyId: PolicyId | null;
  contributors: PolicyId[];
}

function foldSetField<T>(
  state: SetFieldState<T>,
  policyId: PolicyId,
  proposed: readonly T[] | undefined,
  field: 'allowedRegions' | 'allowedProviders',
  conflicts: { field: 'allowedRegions' | 'allowedProviders'; priorPolicyId: PolicyId | null; causingPolicyId: PolicyId }[],
): void {
  if (proposed === undefined) {
    return;
  }
  const proposedSet = new Set(proposed);
  const wasUnrestrictedOrNonEmpty = state.current === null || state.current.size > 0;
  const nextSet = state.current === null ? proposedSet : new Set([...state.current].filter((v) => proposedSet.has(v)));

  if (nextSet.size === 0 && wasUnrestrictedOrNonEmpty) {
    conflicts.push({ field, priorPolicyId: state.makerPolicyId, causingPolicyId: policyId });
  } else if (state.current === null || !setEquals(nextSet, state.current)) {
    state.contributors.push(policyId);
  }

  state.current = nextSet;
  if (nextSet.size > 0) {
    state.makerPolicyId = policyId;
  }
}

function normalizeWeights(weights: Weights): Weights {
  const sum = weights.quality + weights.cost + weights.latency;
  if (sum === 0) {
    return DEFAULT_WEIGHTS;
  }
  if (sum === 1) {
    return weights;
  }
  return {
    quality: weights.quality / sum,
    cost: weights.cost / sum,
    latency: weights.latency / sum,
  };
}

export function resolvePolicy(input: ResolvePolicyInput): EffectivePolicy {
  const matched = input.policies.filter(
    (p) => p.status === 'active' && selectorMatches(p.selector, input.position),
  );
  const sorted = sortMatchedPolicies(matched);

  const regionState: SetFieldState<Region> = { current: null, makerPolicyId: null, contributors: [] };
  const providerState: SetFieldState<string> = { current: null, makerPolicyId: null, contributors: [] };
  const conflicts: ConstraintContributors['conflicts'][number][] = [];

  let bannedModels = new Set<ModelId>();
  const bannedModelsContributors: PolicyId[] = [];
  let requireLocal = false;
  const requireLocalContributors: PolicyId[] = [];
  let maxCostPerRun: number | null = null;
  const maxCostPerRunContributors: PolicyId[] = [];

  let weights: Weights = { ...DEFAULT_WEIGHTS };

  for (const policy of sorted) {
    foldSetField(regionState, policy.id, policy.allowedRegions, 'allowedRegions', conflicts);
    foldSetField(providerState, policy.id, policy.allowedProviders, 'allowedProviders', conflicts);

    if (policy.bannedModels !== undefined && policy.bannedModels.length > 0) {
      const before = bannedModels.size;
      const next = new Set(bannedModels);
      for (const modelId of policy.bannedModels) {
        next.add(modelId);
      }
      if (next.size !== before) {
        bannedModelsContributors.push(policy.id);
      }
      bannedModels = next;
    }

    if (policy.requireLocal === true && !requireLocal) {
      requireLocal = true;
      requireLocalContributors.push(policy.id);
    }

    if (
      policy.maxCostPerRun !== undefined &&
      (maxCostPerRun === null || policy.maxCostPerRun < maxCostPerRun)
    ) {
      maxCostPerRun = policy.maxCostPerRun;
      maxCostPerRunContributors.push(policy.id);
    }

    if (policy.weightQuality !== undefined) {
      weights = { ...weights, quality: policy.weightQuality };
    }
    if (policy.weightCost !== undefined) {
      weights = { ...weights, cost: policy.weightCost };
    }
    if (policy.weightLatency !== undefined) {
      weights = { ...weights, latency: policy.weightLatency };
    }
  }

  const constraints: Constraints = {
    allowedRegions: regionState.current,
    allowedProviders: providerState.current,
    bannedModels,
    requireLocal,
    maxCostPerRun,
    conflict: conflicts.length > 0,
  };

  const contributors: ConstraintContributors = {
    allowedRegions: regionState.contributors,
    allowedProviders: providerState.contributors,
    bannedModels: bannedModelsContributors,
    requireLocal: requireLocalContributors,
    maxCostPerRun: maxCostPerRunContributors,
    conflicts,
  };

  const isPositionComplete = input.dimensions.every((d) => d.id in input.position);

  return {
    constraints,
    contributors,
    weights: normalizeWeights(weights),
    appliedPolicyIds: sorted.map((p) => p.id),
    warnings: isPositionComplete ? [] : ['WARN_POSITION_INCOMPLETE'],
  };
}
