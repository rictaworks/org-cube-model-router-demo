import { describe, expect, it } from 'vitest';
import { manageDimension } from './dimensionManager.js';
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
import type { Dimension, Policy, Task } from './types.js';

function dim(id: number, name: string, displayOrder: number, values: Dimension['values'] = []): Dimension {
  return { id, name, displayOrder, values };
}

function task(id: number, position: Task['position']): Task {
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
    monthlyRuns: 0,
    position,
    pinnedModelId: null,
  };
}

function policy(id: number, selector: Policy['selector'], status: Policy['status'] = 'active'): Policy {
  return { id, name: `policy-${id}`, status, priority: 0, selector };
}

describe('manageDimension（関数A：requirements.md 4.1節）', () => {
  describe('次元追加', () => {
    it('次元を末尾に追加し、再計算を要求する', () => {
      const result = manageDimension({
        dimensions: [dim(1, '部門', 1)],
        tasks: [],
        policies: [],
        operation: { kind: 'add_dimension', name: '拠点' },
        nextDimensionId: 2,
        nextValueId: 1,
      });

      expect(result.dimensions).toHaveLength(2);
      expect(result.dimensions[1]).toEqual({ id: 2, name: '拠点', displayOrder: 2, values: [] });
      expect(result.requiresRecompute).toBe(true);
      expect(result.affectedTaskCount).toBe(0);
      expect(result.affectedPolicyIds).toEqual([]);
    });

    it('空文字の次元名を拒否する', () => {
      expect(() =>
        manageDimension({
          dimensions: [],
          tasks: [],
          policies: [],
          operation: { kind: 'add_dimension', name: '  ' },
          nextDimensionId: 1,
          nextValueId: 1,
        }),
      ).toThrow(EmptyNameError);
    });

    it('重複した次元名を拒否する', () => {
      expect(() =>
        manageDimension({
          dimensions: [dim(1, '部門', 1)],
          tasks: [],
          policies: [],
          operation: { kind: 'add_dimension', name: '部門' },
          nextDimensionId: 2,
          nextValueId: 1,
        }),
      ).toThrow(DuplicateNameError);
    });

    it('次元数上限を超える追加を拒否する', () => {
      const dimensions = Array.from({ length: MAX_DIMENSIONS }, (_, i) => dim(i + 1, `次元${i + 1}`, i + 1));
      expect(() =>
        manageDimension({
          dimensions,
          tasks: [],
          policies: [],
          operation: { kind: 'add_dimension', name: '追加次元' },
          nextDimensionId: MAX_DIMENSIONS + 1,
          nextValueId: 1,
        }),
      ).toThrow(LimitExceededError);
    });
  });

  describe('次元改名', () => {
    it('IDは変わらないため、既存の座標・セレクタの一致判定に影響しない', () => {
      const result = manageDimension({
        dimensions: [dim(1, '部門', 1)],
        tasks: [task(1, { 1: 10 })],
        policies: [policy(1, { 1: 10 })],
        operation: { kind: 'rename_dimension', dimensionId: 1, name: '事業部門' },
        nextDimensionId: 2,
        nextValueId: 1,
      });

      expect(result.dimensions[0]?.name).toBe('事業部門');
      expect(result.dimensions[0]?.id).toBe(1);
      expect(result.tasks[0]?.position).toEqual({ 1: 10 });
      expect(result.policies[0]?.selector).toEqual({ 1: 10 });
      expect(result.requiresRecompute).toBe(false);
    });

    it('存在しない次元IDを拒否する', () => {
      expect(() =>
        manageDimension({
          dimensions: [],
          tasks: [],
          policies: [],
          operation: { kind: 'rename_dimension', dimensionId: 999, name: 'X' },
          nextDimensionId: 1,
          nextValueId: 1,
        }),
      ).toThrow(DimensionNotFoundError);
    });
  });

  describe('次元削除', () => {
    it('タスクの座標からその次元を取り除き、参照ポリシーを無効化（削除しない）する', () => {
      const dimensions = [dim(1, '部門', 1, [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }])];
      const tasks = [task(1, { 1: 10 }), task(2, {})];
      const policies = [policy(1, { 1: 10 }), policy(2, {})];

      const result = manageDimension({
        dimensions,
        tasks,
        policies,
        operation: { kind: 'delete_dimension', dimensionId: 1 },
        nextDimensionId: 2,
        nextValueId: 11,
      });

      expect(result.dimensions).toEqual([]);
      expect(result.tasks[0]?.position).toEqual({});
      expect(result.tasks[1]?.position).toEqual({});
      expect(result.policies[0]?.status).toBe('disabled');
      expect(result.policies[0]?.disabledReason).toBe('次元削除');
      // セレクタは一般化（値を外す）せず、そのまま保持する
      expect(result.policies[0]?.selector).toEqual({ 1: 10 });
      expect(result.policies[1]?.status).toBe('active');
      expect(result.affectedTaskCount).toBe(1);
      expect(result.affectedPolicyIds).toEqual([1]);
      expect(result.requiresRecompute).toBe(true);
    });

    it('すでに無効なポリシーは再カウントしない', () => {
      const dimensions = [dim(1, '部門', 1)];
      const policies = [policy(1, { 1: 10 }, 'disabled')];

      const result = manageDimension({
        dimensions,
        tasks: [],
        policies,
        operation: { kind: 'delete_dimension', dimensionId: 1 },
        nextDimensionId: 2,
        nextValueId: 1,
      });

      expect(result.affectedPolicyIds).toEqual([]);
    });

    it('存在しない次元IDを拒否する', () => {
      expect(() =>
        manageDimension({
          dimensions: [],
          tasks: [],
          policies: [],
          operation: { kind: 'delete_dimension', dimensionId: 999 },
          nextDimensionId: 1,
          nextValueId: 1,
        }),
      ).toThrow(DimensionNotFoundError);
    });
  });

  describe('値追加', () => {
    it('値を末尾に追加する', () => {
      const result = manageDimension({
        dimensions: [dim(1, '部門', 1, [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }])],
        tasks: [],
        policies: [],
        operation: { kind: 'add_value', dimensionId: 1, name: '開発' },
        nextDimensionId: 2,
        nextValueId: 11,
      });

      expect(result.dimensions[0]?.values).toEqual([
        { id: 10, dimensionId: 1, name: '営業', displayOrder: 1 },
        { id: 11, dimensionId: 1, name: '開発', displayOrder: 2 },
      ]);
      expect(result.requiresRecompute).toBe(false);
    });

    it('次元内で重複する値名を拒否する', () => {
      expect(() =>
        manageDimension({
          dimensions: [dim(1, '部門', 1, [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }])],
          tasks: [],
          policies: [],
          operation: { kind: 'add_value', dimensionId: 1, name: '営業' },
          nextDimensionId: 2,
          nextValueId: 11,
        }),
      ).toThrow(DuplicateNameError);
    });

    it('値数上限を超える追加を拒否する', () => {
      const values = Array.from({ length: MAX_VALUES_PER_DIMENSION }, (_, i) => ({
        id: i + 1,
        dimensionId: 1,
        name: `値${i + 1}`,
        displayOrder: i + 1,
      }));
      expect(() =>
        manageDimension({
          dimensions: [dim(1, '部門', 1, values)],
          tasks: [],
          policies: [],
          operation: { kind: 'add_value', dimensionId: 1, name: '追加値' },
          nextDimensionId: 2,
          nextValueId: MAX_VALUES_PER_DIMENSION + 1,
        }),
      ).toThrow(LimitExceededError);
    });

    it('存在しない次元IDを拒否する', () => {
      expect(() =>
        manageDimension({
          dimensions: [],
          tasks: [],
          policies: [],
          operation: { kind: 'add_value', dimensionId: 999, name: 'X' },
          nextDimensionId: 1,
          nextValueId: 1,
        }),
      ).toThrow(DimensionNotFoundError);
    });
  });

  describe('値改名', () => {
    it('参照はIDで保持されるため一致判定に影響しない', () => {
      const dimensions = [dim(1, '部門', 1, [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }])];
      const result = manageDimension({
        dimensions,
        tasks: [task(1, { 1: 10 })],
        policies: [policy(1, { 1: 10 })],
        operation: { kind: 'rename_value', dimensionId: 1, valueId: 10, name: '営業部' },
        nextDimensionId: 2,
        nextValueId: 11,
      });

      expect(result.dimensions[0]?.values[0]?.name).toBe('営業部');
      expect(result.tasks[0]?.position).toEqual({ 1: 10 });
      expect(result.policies[0]?.selector).toEqual({ 1: 10 });
      expect(result.requiresRecompute).toBe(false);
    });

    it('存在しない値IDを拒否する', () => {
      expect(() =>
        manageDimension({
          dimensions: [dim(1, '部門', 1)],
          tasks: [],
          policies: [],
          operation: { kind: 'rename_value', dimensionId: 1, valueId: 999, name: 'X' },
          nextDimensionId: 2,
          nextValueId: 1,
        }),
      ).toThrow(ValueNotFoundError);
    });
  });

  describe('値削除', () => {
    it('参照が無ければ削除できる', () => {
      const dimensions = [dim(1, '部門', 1, [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }])];
      const result = manageDimension({
        dimensions,
        tasks: [],
        policies: [],
        operation: { kind: 'delete_value', dimensionId: 1, valueId: 10 },
        nextDimensionId: 2,
        nextValueId: 11,
      });

      expect(result.dimensions[0]?.values).toEqual([]);
      expect(result.requiresRecompute).toBe(true);
    });

    it('タスクが参照していれば削除を拒否し、件数を提示する', () => {
      const dimensions = [dim(1, '部門', 1, [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }])];
      const tasks = [task(1, { 1: 10 }), task(2, { 1: 10 })];

      let caught: unknown;
      try {
        manageDimension({
          dimensions,
          tasks,
          policies: [],
          operation: { kind: 'delete_value', dimensionId: 1, valueId: 10 },
          nextDimensionId: 2,
          nextValueId: 11,
        });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(ValueInUseError);
      expect((caught as ValueInUseError).taskCount).toBe(2);
      expect((caught as ValueInUseError).policyCount).toBe(0);
    });

    it('ポリシーが参照していれば削除を拒否する（無効化されたポリシーの参照も対象）', () => {
      const dimensions = [dim(1, '部門', 1, [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }])];
      const policies = [policy(1, { 1: 10 }, 'disabled')];

      expect(() =>
        manageDimension({
          dimensions,
          tasks: [],
          policies,
          operation: { kind: 'delete_value', dimensionId: 1, valueId: 10 },
          nextDimensionId: 2,
          nextValueId: 11,
        }),
      ).toThrow(ValueInUseError);
    });
  });

  describe('表示順変更', () => {
    it('次元の表示順を並び替える', () => {
      const dimensions = [dim(1, '部門', 1), dim(2, '拠点', 2)];
      const result = manageDimension({
        dimensions,
        tasks: [],
        policies: [],
        operation: { kind: 'reorder_dimensions', orderedDimensionIds: [2, 1] },
        nextDimensionId: 3,
        nextValueId: 1,
      });

      expect(result.dimensions.map((d) => [d.id, d.displayOrder])).toEqual([
        [2, 1],
        [1, 2],
      ]);
      expect(result.requiresRecompute).toBe(false);
    });

    it('現在の次元集合と一致しない並び替えを拒否する', () => {
      const dimensions = [dim(1, '部門', 1), dim(2, '拠点', 2)];
      expect(() =>
        manageDimension({
          dimensions,
          tasks: [],
          policies: [],
          operation: { kind: 'reorder_dimensions', orderedDimensionIds: [1] },
          nextDimensionId: 3,
          nextValueId: 1,
        }),
      ).toThrow(InvalidOrderError);
    });

    it('値の表示順を並び替える', () => {
      const dimensions = [
        dim(1, '部門', 1, [
          { id: 10, dimensionId: 1, name: '営業', displayOrder: 1 },
          { id: 11, dimensionId: 1, name: '開発', displayOrder: 2 },
        ]),
      ];
      const result = manageDimension({
        dimensions,
        tasks: [],
        policies: [],
        operation: { kind: 'reorder_values', dimensionId: 1, orderedValueIds: [11, 10] },
        nextDimensionId: 2,
        nextValueId: 12,
      });

      expect(result.dimensions[0]?.values.map((v) => [v.id, v.displayOrder])).toEqual([
        [11, 1],
        [10, 2],
      ]);
    });
  });
});
