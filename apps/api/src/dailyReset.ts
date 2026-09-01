/**
 * 日次リセットの判定ロジック（requirements.md 4.8節）。
 *
 * 「直近のJST 03:00」の境界時刻を求める純粋関数と、前回リセット日時と比較して
 * リセットが必要かを判定する純粋関数のみをここに置く（外部I/Oを持たない）。
 * 実際の削除処理（D1への書き込み）は resetRepository.ts が担う。
 */
import { DAILY_RESET_HOUR_JST, JST_OFFSET_MINUTES } from './config.js';

const JST_OFFSET_MS = JST_OFFSET_MINUTES * 60 * 1000;

/**
 * 現在時刻（UTC）から見て「直近のJST 03:00」に相当するUTC時刻を返す。
 * 現在時刻がJSTで当日03:00より前であれば、前日の03:00を返す。
 */
export function mostRecentResetBoundaryUtc(nowUtc: Date): Date {
  const nowJst = new Date(nowUtc.getTime() + JST_OFFSET_MS);
  const boundaryJst = new Date(
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate(), DAILY_RESET_HOUR_JST, 0, 0, 0),
  );
  if (nowJst.getTime() < boundaryJst.getTime()) {
    boundaryJst.setUTCDate(boundaryJst.getUTCDate() - 1);
  }
  return new Date(boundaryJst.getTime() - JST_OFFSET_MS);
}

/** 前回リセット日時が「直近のJST 03:00」より前であれば、リセットが必要と判定する。 */
export function shouldResetSession(lastResetAtUtc: Date, nowUtc: Date): boolean {
  return lastResetAtUtc.getTime() < mostRecentResetBoundaryUtc(nowUtc).getTime();
}
