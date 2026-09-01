import { describe, expect, it } from 'vitest';
import { mostRecentResetBoundaryUtc, shouldResetSession } from './dailyReset.js';

describe('mostRecentResetBoundaryUtc（requirements.md 4.8節：JST 03:00基準）', () => {
  it('JSTで当日03:00以降であれば当日03:00 JSTを返す', () => {
    // 2026-01-10 05:00 JST = 2026-01-09 20:00 UTC
    const now = new Date('2026-01-09T20:00:00.000Z');
    const boundary = mostRecentResetBoundaryUtc(now);
    // 2026-01-10 03:00 JST = 2026-01-09 18:00 UTC
    expect(boundary.toISOString()).toBe('2026-01-09T18:00:00.000Z');
  });

  it('JSTで当日03:00より前であれば前日03:00 JSTを返す', () => {
    // 2026-01-10 02:00 JST = 2026-01-09 17:00 UTC
    const now = new Date('2026-01-09T17:00:00.000Z');
    const boundary = mostRecentResetBoundaryUtc(now);
    // 2026-01-09 03:00 JST = 2026-01-08 18:00 UTC
    expect(boundary.toISOString()).toBe('2026-01-08T18:00:00.000Z');
  });

  it('JSTでちょうど03:00であれば当日03:00 JSTを返す（境界を含む）', () => {
    const now = new Date('2026-01-09T18:00:00.000Z');
    const boundary = mostRecentResetBoundaryUtc(now);
    expect(boundary.toISOString()).toBe('2026-01-09T18:00:00.000Z');
  });
});

describe('shouldResetSession（requirements.md 4.8節）', () => {
  it('前回リセットが直近の境界より前であればtrueを返す', () => {
    const lastResetAt = new Date('2026-01-08T17:00:00.000Z');
    const now = new Date('2026-01-09T20:00:00.000Z');
    expect(shouldResetSession(lastResetAt, now)).toBe(true);
  });

  it('前回リセットが直近の境界以降であればfalseを返す', () => {
    const lastResetAt = new Date('2026-01-09T19:00:00.000Z');
    const now = new Date('2026-01-09T20:00:00.000Z');
    expect(shouldResetSession(lastResetAt, now)).toBe(false);
  });

  it('前回リセットが境界とちょうど同時刻であればfalseを返す（境界時刻自体はリセット済み扱い）', () => {
    const boundary = new Date('2026-01-09T18:00:00.000Z');
    const now = new Date('2026-01-09T20:00:00.000Z');
    expect(shouldResetSession(boundary, now)).toBe(false);
  });
});
