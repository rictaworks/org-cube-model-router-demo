import { describe, expect, it } from 'vitest';
import {
  DimensionNotFoundError,
  DuplicateNameError,
  EmptyNameError,
  LimitExceededError,
  RouterCoreError,
  UnknownModelError,
  ValueInUseError,
  ValueNotFoundError,
} from './errors.js';

describe('errors（想定外の状態を例外で明示的に扱う。フォールバック禁止）', () => {
  it('すべてのエラーはRouterCoreErrorを継承しErrorとしてもcatchできる', () => {
    const errors = [
      new EmptyNameError('dimension'),
      new DuplicateNameError('value', '営業'),
      new LimitExceededError('dimension', 6),
      new DimensionNotFoundError(999),
      new ValueNotFoundError(999),
      new ValueInUseError(2, 1),
      new UnknownModelError('unknown-model'),
    ];
    for (const error of errors) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RouterCoreError);
      expect(error.message.length).toBeGreaterThan(0);
    }
  });

  it('DuplicateNameErrorは重複した名前をメッセージに含む', () => {
    const error = new DuplicateNameError('dimension', '部門');
    expect(error.message).toContain('部門');
    expect(error.name).toBe('DuplicateNameError');
  });

  it('ValueInUseErrorは参照件数を保持する', () => {
    const error = new ValueInUseError(3, 2);
    expect(error.taskCount).toBe(3);
    expect(error.policyCount).toBe(2);
    expect(error.message).toContain('3');
    expect(error.message).toContain('2');
  });

  it('LimitExceededErrorは上限値を保持する', () => {
    const error = new LimitExceededError('value', 20);
    expect(error.limit).toBe(20);
  });

  it('UnknownModelErrorは対象モデルIDを保持する', () => {
    const error = new UnknownModelError('missing-model');
    expect(error.modelId).toBe('missing-model');
    expect(error.message).toContain('missing-model');
  });
});
