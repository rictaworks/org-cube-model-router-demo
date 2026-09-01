/**
 * router-core が送出する例外群。
 *
 * CONTRIBUTING.md「フォールバック禁止」に従い、想定外の状態（重複名・上限超過・
 * 参照先不明・参照中の削除・未知のモデルID等）は握りつぶさずすべて例外として
 * 明示的に送出する。呼び出し側（apps/api）はエラーの型で分岐し、利用者に理由を提示する。
 */
import { ERROR_MESSAGES, type NamedEntityKind } from './messages.js';

/** router-core が送出するすべての例外の基底クラス。 */
export abstract class RouterCoreError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 次元名・値名が空文字である。 */
export class EmptyNameError extends RouterCoreError {
  constructor(public readonly kind: NamedEntityKind) {
    super(ERROR_MESSAGES.emptyName(kind));
  }
}

/** 次元名・値名が同一スコープ内で重複している。 */
export class DuplicateNameError extends RouterCoreError {
  constructor(
    public readonly kind: NamedEntityKind,
    public readonly name_: string,
  ) {
    super(ERROR_MESSAGES.duplicateName(kind, name_));
  }
}

/** 次元数・値数が上限を超えている。 */
export class LimitExceededError extends RouterCoreError {
  constructor(
    public readonly kind: NamedEntityKind,
    public readonly limit: number,
  ) {
    super(ERROR_MESSAGES.limitExceeded(kind, limit));
  }
}

/** 指定された次元IDが存在しない。 */
export class DimensionNotFoundError extends RouterCoreError {
  constructor(public readonly dimensionId: number) {
    super(ERROR_MESSAGES.dimensionNotFound(dimensionId));
  }
}

/** 指定された値IDが存在しない。 */
export class ValueNotFoundError extends RouterCoreError {
  constructor(public readonly valueId: number) {
    super(ERROR_MESSAGES.valueNotFound(valueId));
  }
}

/** 削除対象の値がタスク・ポリシーから参照されているため削除できない（4.1節手順5）。 */
export class ValueInUseError extends RouterCoreError {
  constructor(
    public readonly taskCount: number,
    public readonly policyCount: number,
  ) {
    super(ERROR_MESSAGES.valueInUse(taskCount, policyCount));
  }
}

/** manageDimension に未知の操作種別が渡された。 */
export class UnknownOperationError extends RouterCoreError {
  constructor(public readonly kind: string) {
    super(ERROR_MESSAGES.unknownOperationKind(kind));
  }
}

/** 評価行の一覧に指定モデルIDが存在しない（pinModel等）。 */
export class UnknownModelError extends RouterCoreError {
  constructor(public readonly modelId: string) {
    super(ERROR_MESSAGES.unknownModelInEvaluationRows(modelId));
  }
}
