/**
 * 関数A：次元管理（manageDimension）。requirements.md 4.1節。
 *
 * 純粋関数として実装する。ID発番はDB層の責務のため、追加時に使う次の次元ID・値ID
 * は呼び出し側が nextDimensionId / nextValueId として渡す。
 */
import { MAX_DIMENSIONS, MAX_VALUES_PER_DIMENSION } from './constants.js';
import {
  DimensionNotFoundError,
  DuplicateNameError,
  EmptyNameError,
  InvalidOrderError,
  LimitExceededError,
  ValueInUseError,
  ValueNotFoundError,
} from './errors.js';
import { POLICY_DISABLED_REASONS } from './messages.js';
import type { Dimension, DimensionId, DimensionValue, Policy, PolicyId, Task, ValueId } from './types.js';

export type DimensionOperation =
  | { readonly kind: 'add_dimension'; readonly name: string }
  | { readonly kind: 'rename_dimension'; readonly dimensionId: DimensionId; readonly name: string }
  | { readonly kind: 'delete_dimension'; readonly dimensionId: DimensionId }
  | { readonly kind: 'add_value'; readonly dimensionId: DimensionId; readonly name: string }
  | {
      readonly kind: 'rename_value';
      readonly dimensionId: DimensionId;
      readonly valueId: ValueId;
      readonly name: string;
    }
  | { readonly kind: 'delete_value'; readonly dimensionId: DimensionId; readonly valueId: ValueId }
  | { readonly kind: 'reorder_dimensions'; readonly orderedDimensionIds: readonly DimensionId[] }
  | {
      readonly kind: 'reorder_values';
      readonly dimensionId: DimensionId;
      readonly orderedValueIds: readonly ValueId[];
    };

export interface ManageDimensionInput {
  readonly dimensions: readonly Dimension[];
  readonly tasks: readonly Task[];
  readonly policies: readonly Policy[];
  readonly operation: DimensionOperation;
  /** 次元を追加する場合に採番するID。 */
  readonly nextDimensionId: DimensionId;
  /** 値を追加する場合に採番するID。 */
  readonly nextValueId: ValueId;
}

export interface ManageDimensionResult {
  readonly dimensions: readonly Dimension[];
  readonly tasks: readonly Task[];
  readonly policies: readonly Policy[];
  readonly affectedTaskCount: number;
  readonly affectedPolicyIds: readonly PolicyId[];
  /** true の場合、呼び出し側は関数E（recomputeAll）を実行する（4.1節手順7）。 */
  readonly requiresRecompute: boolean;
}

function assertNonEmptyName(name: string, kind: 'dimension' | 'value'): void {
  if (name.trim().length === 0) {
    throw new EmptyNameError(kind);
  }
}

function findDimension(dimensions: readonly Dimension[], dimensionId: DimensionId): Dimension {
  const dimension = dimensions.find((d) => d.id === dimensionId);
  if (dimension === undefined) {
    throw new DimensionNotFoundError(dimensionId);
  }
  return dimension;
}

function findValue(dimension: Dimension, valueId: ValueId): DimensionValue {
  const value = dimension.values.find((v) => v.id === valueId);
  if (value === undefined) {
    throw new ValueNotFoundError(valueId);
  }
  return value;
}

function withoutRecompute(
  dimensions: readonly Dimension[],
  tasks: readonly Task[],
  policies: readonly Policy[],
): ManageDimensionResult {
  return {
    dimensions,
    tasks,
    policies,
    affectedTaskCount: 0,
    affectedPolicyIds: [],
    requiresRecompute: false,
  };
}

function addDimension(input: ManageDimensionInput, name: string): ManageDimensionResult {
  if (input.dimensions.length >= MAX_DIMENSIONS) {
    throw new LimitExceededError('dimension', MAX_DIMENSIONS);
  }
  assertNonEmptyName(name, 'dimension');
  if (input.dimensions.some((d) => d.name === name)) {
    throw new DuplicateNameError('dimension', name);
  }

  const newDimension: Dimension = {
    id: input.nextDimensionId,
    name,
    displayOrder: input.dimensions.length + 1,
    values: [],
  };

  return {
    dimensions: [...input.dimensions, newDimension],
    tasks: input.tasks,
    policies: input.policies,
    affectedTaskCount: 0,
    affectedPolicyIds: [],
    requiresRecompute: true,
  };
}

function renameDimension(input: ManageDimensionInput, dimensionId: DimensionId, name: string): ManageDimensionResult {
  findDimension(input.dimensions, dimensionId);
  assertNonEmptyName(name, 'dimension');
  if (input.dimensions.some((d) => d.id !== dimensionId && d.name === name)) {
    throw new DuplicateNameError('dimension', name);
  }

  const dimensions = input.dimensions.map((d) => (d.id === dimensionId ? { ...d, name } : d));
  return withoutRecompute(dimensions, input.tasks, input.policies);
}

function deleteDimension(input: ManageDimensionInput, dimensionId: DimensionId): ManageDimensionResult {
  findDimension(input.dimensions, dimensionId);

  const dimensions = input.dimensions.filter((d) => d.id !== dimensionId);

  let affectedTaskCount = 0;
  const tasks = input.tasks.map((t) => {
    if (!(dimensionId in t.position)) {
      return t;
    }
    affectedTaskCount += 1;
    const position = { ...t.position };
    delete (position as Record<DimensionId, ValueId>)[dimensionId];
    return { ...t, position };
  });

  const affectedPolicyIds: PolicyId[] = [];
  const policies = input.policies.map((p) => {
    if (p.status !== 'active' || !(dimensionId in p.selector)) {
      return p;
    }
    affectedPolicyIds.push(p.id);
    return { ...p, status: 'disabled' as const, disabledReason: POLICY_DISABLED_REASONS.dimensionDeleted };
  });

  return {
    dimensions,
    tasks,
    policies,
    affectedTaskCount,
    affectedPolicyIds,
    requiresRecompute: true,
  };
}

function addValue(input: ManageDimensionInput, dimensionId: DimensionId, name: string): ManageDimensionResult {
  const dimension = findDimension(input.dimensions, dimensionId);
  if (dimension.values.length >= MAX_VALUES_PER_DIMENSION) {
    throw new LimitExceededError('value', MAX_VALUES_PER_DIMENSION);
  }
  assertNonEmptyName(name, 'value');
  if (dimension.values.some((v) => v.name === name)) {
    throw new DuplicateNameError('value', name);
  }

  const newValue: DimensionValue = {
    id: input.nextValueId,
    dimensionId,
    name,
    displayOrder: dimension.values.length + 1,
  };

  const dimensions = input.dimensions.map((d) =>
    d.id === dimensionId ? { ...d, values: [...d.values, newValue] } : d,
  );
  return withoutRecompute(dimensions, input.tasks, input.policies);
}

function renameValue(
  input: ManageDimensionInput,
  dimensionId: DimensionId,
  valueId: ValueId,
  name: string,
): ManageDimensionResult {
  const dimension = findDimension(input.dimensions, dimensionId);
  findValue(dimension, valueId);
  assertNonEmptyName(name, 'value');
  if (dimension.values.some((v) => v.id !== valueId && v.name === name)) {
    throw new DuplicateNameError('value', name);
  }

  const dimensions = input.dimensions.map((d) =>
    d.id === dimensionId
      ? { ...d, values: d.values.map((v) => (v.id === valueId ? { ...v, name } : v)) }
      : d,
  );
  return withoutRecompute(dimensions, input.tasks, input.policies);
}

function deleteValue(input: ManageDimensionInput, dimensionId: DimensionId, valueId: ValueId): ManageDimensionResult {
  const dimension = findDimension(input.dimensions, dimensionId);
  findValue(dimension, valueId);

  const taskCount = input.tasks.filter((t) => t.position[dimensionId] === valueId).length;
  const policyCount = input.policies.filter((p) => p.selector[dimensionId] === valueId).length;
  if (taskCount > 0 || policyCount > 0) {
    throw new ValueInUseError(taskCount, policyCount);
  }

  const dimensions = input.dimensions.map((d) =>
    d.id === dimensionId ? { ...d, values: d.values.filter((v) => v.id !== valueId) } : d,
  );

  return {
    dimensions,
    tasks: input.tasks,
    policies: input.policies,
    affectedTaskCount: 0,
    affectedPolicyIds: [],
    requiresRecompute: true,
  };
}

function reorderDimensions(
  input: ManageDimensionInput,
  orderedDimensionIds: readonly DimensionId[],
): ManageDimensionResult {
  const currentIds = new Set(input.dimensions.map((d) => d.id));
  const nextIds = new Set(orderedDimensionIds);
  const isSameSet =
    currentIds.size === nextIds.size && [...currentIds].every((id) => nextIds.has(id));
  if (!isSameSet) {
    throw new InvalidOrderError('dimension');
  }

  const orderById = new Map(orderedDimensionIds.map((id, index) => [id, index + 1]));
  const dimensions = [...input.dimensions]
    .map((d) => ({ ...d, displayOrder: orderById.get(d.id) ?? d.displayOrder }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return withoutRecompute(dimensions, input.tasks, input.policies);
}

function reorderValues(
  input: ManageDimensionInput,
  dimensionId: DimensionId,
  orderedValueIds: readonly ValueId[],
): ManageDimensionResult {
  const dimension = findDimension(input.dimensions, dimensionId);
  const currentIds = new Set(dimension.values.map((v) => v.id));
  const nextIds = new Set(orderedValueIds);
  const isSameSet =
    currentIds.size === nextIds.size && [...currentIds].every((id) => nextIds.has(id));
  if (!isSameSet) {
    throw new InvalidOrderError('value');
  }

  const orderById = new Map(orderedValueIds.map((id, index) => [id, index + 1]));
  const dimensions = input.dimensions.map((d) => {
    if (d.id !== dimensionId) {
      return d;
    }
    const values = [...d.values]
      .map((v) => ({ ...v, displayOrder: orderById.get(v.id) ?? v.displayOrder }))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return { ...d, values };
  });

  return withoutRecompute(dimensions, input.tasks, input.policies);
}

export function manageDimension(input: ManageDimensionInput): ManageDimensionResult {
  const { operation } = input;
  switch (operation.kind) {
    case 'add_dimension':
      return addDimension(input, operation.name);
    case 'rename_dimension':
      return renameDimension(input, operation.dimensionId, operation.name);
    case 'delete_dimension':
      return deleteDimension(input, operation.dimensionId);
    case 'add_value':
      return addValue(input, operation.dimensionId, operation.name);
    case 'rename_value':
      return renameValue(input, operation.dimensionId, operation.valueId, operation.name);
    case 'delete_value':
      return deleteValue(input, operation.dimensionId, operation.valueId);
    case 'reorder_dimensions':
      return reorderDimensions(input, operation.orderedDimensionIds);
    case 'reorder_values':
      return reorderValues(input, operation.dimensionId, operation.orderedValueIds);
  }
}
