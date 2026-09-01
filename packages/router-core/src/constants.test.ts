import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_FLOOR,
  CONTEXT_MARGIN_FACTOR,
  DEFAULT_WEIGHTS,
  INPUT_TOKEN_RANGE,
  MAX_DIMENSIONS,
  MAX_POLICIES,
  MAX_TASKS,
  MAX_VALUES_PER_DIMENSION,
  MONTHLY_RUNS_RANGE,
  OUTPUT_TOKEN_RANGE,
  RUNNER_UP_COUNT,
} from './constants.js';

describe('constants（requirements.md 4.10節）', () => {
  it('次元数上限は6', () => {
    expect(MAX_DIMENSIONS).toBe(6);
  });

  it('次元あたり値数上限は20', () => {
    expect(MAX_VALUES_PER_DIMENSION).toBe(20);
  });

  it('ポリシー数上限は50', () => {
    expect(MAX_POLICIES).toBe(50);
  });

  it('タスク数上限は200', () => {
    expect(MAX_TASKS).toBe(200);
  });

  it('既定重みは品質0.5・コスト0.3・速度0.2', () => {
    expect(DEFAULT_WEIGHTS).toEqual({ quality: 0.5, cost: 0.3, latency: 0.2 });
  });

  it('既定重みの合計は1', () => {
    expect(DEFAULT_WEIGHTS.quality + DEFAULT_WEIGHTS.cost + DEFAULT_WEIGHTS.latency).toBeCloseTo(1);
  });

  it('能力下限は低2・中3・高4', () => {
    expect(CAPABILITY_FLOOR).toEqual({ low: 2, medium: 3, high: 4 });
  });

  it('コンテキスト余裕係数は1.2', () => {
    expect(CONTEXT_MARGIN_FACTOR).toBe(1.2);
  });

  it('次点候補の件数は3', () => {
    expect(RUNNER_UP_COUNT).toBe(3);
  });

  it('入力トークン見積の範囲は1〜1,000,000', () => {
    expect(INPUT_TOKEN_RANGE).toEqual({ min: 1, max: 1000000 });
  });

  it('出力トークン見積の範囲は1〜100,000', () => {
    expect(OUTPUT_TOKEN_RANGE).toEqual({ min: 1, max: 100000 });
  });

  it('月間実行回数の範囲は0〜1,000,000', () => {
    expect(MONTHLY_RUNS_RANGE).toEqual({ min: 0, max: 1000000 });
  });

  it('定数オブジェクトは凍結されており実行時に変更できない', () => {
    expect(Object.isFrozen(DEFAULT_WEIGHTS)).toBe(true);
    expect(Object.isFrozen(CAPABILITY_FLOOR)).toBe(true);
  });
});
