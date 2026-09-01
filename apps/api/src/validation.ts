/**
 * リクエストボディの検証ヘルパー。想定外の型・値は必ず ApiValidationError を
 * 送出する（CLAUDE.md：フォールバック禁止。想定外の状態は例外として明示的に扱う）。
 */
import { API_MESSAGES } from './config.js';
import { ApiValidationError } from './errors.js';

export function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiValidationError(API_MESSAGES.invalidJsonBody);
  }
  return body as Record<string, unknown>;
}

export function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiValidationError(message);
  }
  return value;
}

export function optionalString(value: unknown, message: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireString(value, message);
}

export function requireBoolean(value: unknown, message: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ApiValidationError(message);
  }
  return value;
}

export function optionalBoolean(value: unknown, message: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireBoolean(value, message);
}

export function requireFiniteNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiValidationError(message);
  }
  return value;
}

export function optionalFiniteNumber(value: unknown, message: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireFiniteNumber(value, message);
}

export function requireInteger(value: unknown, message: string): number {
  const n = requireFiniteNumber(value, message);
  if (!Number.isInteger(n)) {
    throw new ApiValidationError(message);
  }
  return n;
}

export function requireIntegerInRange(value: unknown, min: number, max: number, message: string): number {
  const n = requireInteger(value, message);
  if (n < min || n > max) {
    throw new ApiValidationError(message);
  }
  return n;
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new ApiValidationError(message);
  }
  return value as T;
}

export function requireStringArray(value: unknown, message: string): readonly string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new ApiValidationError(message);
  }
  return value as readonly string[];
}

export function optionalStringArray(value: unknown, message: string): readonly string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireStringArray(value, message);
}

/** URLパスの :id パラメータ等を正の整数として解釈する。 */
export function parsePositiveIntParam(raw: string, message: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ApiValidationError(message);
  }
  return n;
}
