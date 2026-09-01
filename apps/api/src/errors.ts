/**
 * apps/api 自身が送出する例外と、router-coreの例外を含めたHTTPステータスへの変換。
 *
 * CLAUDE.md「フォールバック禁止」に従い、想定外の状態はすべて例外として明示的に
 * 送出し、catchで握りつぶさない。ここでの変換は「既知の例外→適切なHTTPステータス」の
 * 対応付けのみを行い、未知の例外は再送出してWorkers全体のエラーハンドラ（500ログ）に
 * 委ねる。
 */
import {
  DimensionNotFoundError,
  DuplicateNameError,
  EmptyNameError,
  InvalidOrderError,
  LimitExceededError,
  RouterCoreError,
  UnknownModelError,
  ValueInUseError,
  ValueNotFoundError,
} from '@org-cube-model-router-demo/router-core';

/** apps/api層の入力検証エラー（4xx: 400）。 */
export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

/** apps/api層のリソース未検出エラー（4xx: 404）。 */
export class ApiNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiNotFoundError';
  }
}

/** apps/api層の業務ルール上の競合エラー（4xx: 409）。 */
export class ApiConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConflictError';
  }
}

export interface HttpErrorMapping {
  readonly status: 400 | 404 | 409 | 422;
  readonly message: string;
}

/**
 * 既知の例外をHTTPステータスへ変換する。マッピングを持たない例外は
 * 呼び出し側へ再送出し、Workers側のグローバルエラーハンドラで500として扱う
 * （想定外の状態を握りつぶさない）。
 */
export function mapKnownErrorToHttp(error: unknown): HttpErrorMapping {
  if (error instanceof ApiValidationError) {
    return { status: 400, message: error.message };
  }
  if (error instanceof ApiNotFoundError) {
    return { status: 404, message: error.message };
  }
  if (error instanceof ApiConflictError) {
    return { status: 409, message: error.message };
  }
  if (error instanceof EmptyNameError) {
    return { status: 400, message: error.message };
  }
  if (error instanceof InvalidOrderError) {
    return { status: 400, message: error.message };
  }
  if (error instanceof DuplicateNameError) {
    return { status: 409, message: error.message };
  }
  if (error instanceof ValueInUseError) {
    return { status: 409, message: error.message };
  }
  if (error instanceof LimitExceededError) {
    return { status: 422, message: error.message };
  }
  if (error instanceof DimensionNotFoundError) {
    return { status: 404, message: error.message };
  }
  if (error instanceof ValueNotFoundError) {
    return { status: 404, message: error.message };
  }
  if (error instanceof UnknownModelError) {
    return { status: 404, message: error.message };
  }
  if (error instanceof RouterCoreError) {
    // 上記いずれにも当てはまらないrouter-core例外（想定外）。
    throw error;
  }
  throw error;
}
