/**
 * requirements.md 4.10節「定数一覧（デモ版の既定値）」に対応する定数群。
 * すべて凍結し、実行時の再代入・改変を防ぐ（グローバル変数を持たない方針の一環）。
 */
import type { Difficulty, Weights } from './types.js';

/** 次元数上限（関数A）。 */
export const MAX_DIMENSIONS = 6;

/** 次元あたり値数上限（関数A）。 */
export const MAX_VALUES_PER_DIMENSION = 20;

/** ポリシー数上限（関数B）。 */
export const MAX_POLICIES = 50;

/** タスク数上限（関数E）。 */
export const MAX_TASKS = 200;

/** 既定重み（品質／コスト／速度）（関数B）。 */
export const DEFAULT_WEIGHTS: Weights = Object.freeze({
  quality: 0.5,
  cost: 0.3,
  latency: 0.2,
});

/** 能力下限（低／中／高）（関数C）。 */
export const CAPABILITY_FLOOR: Readonly<Record<Difficulty, number>> = Object.freeze({
  low: 2,
  medium: 3,
  high: 4,
});

/** コンテキスト余裕係数（関数C）。 */
export const CONTEXT_MARGIN_FACTOR = 1.2;

/** 次点候補の件数（関数D）。 */
export const RUNNER_UP_COUNT = 3;

export interface NumericRange {
  readonly min: number;
  readonly max: number;
}

/** 入力トークン見積の範囲（タスク管理）。 */
export const INPUT_TOKEN_RANGE: NumericRange = Object.freeze({ min: 1, max: 1000000 });

/** 出力トークン見積の範囲（タスク管理）。 */
export const OUTPUT_TOKEN_RANGE: NumericRange = Object.freeze({ min: 1, max: 100000 });

/** 月間実行回数の範囲（タスク管理）。 */
export const MONTHLY_RUNS_RANGE: NumericRange = Object.freeze({ min: 0, max: 1000000 });
