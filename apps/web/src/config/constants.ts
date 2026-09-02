/**
 * apps/web 全体で用いる設定値の集約ファイル。
 * CLAUDE.md「文字列（メッセージ・設定値）はコードに直書きせず設定ファイルに分離する」に従う。
 */
import type { ExclusionReasonCode } from '@org-cube-model-router-demo/router-core';

/** apps/api のベースパス。開発時は apps/web/vite.config.ts のプロキシ経由で apps/api に届く。 */
export const API_BASE_PATH = '/api';

/**
 * ハニーポット項目のフィールド名。apps/api/src/config.ts の HONEYPOT_FIELD_NAME と
 * 一致させる（requirements.md 13.4節）。値を空のまま送信することで、通常利用者の
 * 送信は素通りし、フォームを自動入力するBotのみが値を埋めてしまい弾かれる。
 */
export const HONEYPOT_FIELD_NAME = 'contact_note';

/** SPA内クライアントサイドルーティングのパス一覧。 */
export const ROUTES = Object.freeze({
  home: '/',
  dimensions: '/dimensions',
  policies: '/policies',
  tasks: '/tasks',
  models: '/models',
  assignments: '/assignments',
  assignmentDetail: (taskId: number): string => `/assignments/${taskId}`,
  changeImpacts: '/change-impacts',
  orgView: '/org-view',
  legal: '/legal',
} as const);

/**
 * Ricta Works の全デモ共通の外部リンク先（demo-common-ui.md 参照）。
 * デモごとに値を変えない固定リンクのため、他の設定値と分けてここに集約する。
 */
export const DEMO_COMMON_LINKS = Object.freeze({
  demoList: 'https://rictaworks.jp/#demos',
  consult: 'https://rictaworks.jp/',
});

/** /legal ページの連絡先で使う外部リンク先。全デモ共通（demo-common-ui.md 参照）。 */
export const RICTAWORKS_CONTACT_LINKS = Object.freeze({
  web: 'https://rictaworks.jp',
  x: 'https://x.com/rictaworks',
  github: 'https://github.com/rictaworks',
});

/** GA4（Google Analytics 4）の測定ID。全デモ共通（demo-common-ui.md 参照）。 */
export const GA4_MEASUREMENT_ID = 'G-C04W1XKS16';

/**
 * 除外・警告理由コードのうち、ポリシー由来のものについて「その理由に関係しうる
 * 制約項目」を対応付ける表（apps/api の根拠APIは寄与ポリシーIDを個別のフィールド
 * 単位では返さないため、client側では「適用ポリシーのうち、当該制約項目に値を
 * 設定しているポリシー」を寄与ポリシーの候補として提示する。apps/api/src は
 * 参照専用のため変更できない：apps/web/README.md に設計上の制約として明記する）。
 */
export type ConstraintFieldKey =
  | 'allowedRegions'
  | 'allowedProviders'
  | 'bannedModels'
  | 'requireLocal'
  | 'maxCostPerRun';

export const REASON_CODE_CONSTRAINT_FIELD: Readonly<Partial<Record<ExclusionReasonCode, readonly ConstraintFieldKey[]>>> =
  Object.freeze({
    POLICY_CONFLICT: ['allowedRegions', 'allowedProviders'],
    MODEL_BANNED: ['bannedModels'],
    PROVIDER_NOT_ALLOWED: ['allowedProviders'],
    LOCAL_REQUIRED: ['requireLocal'],
    REGION_NOT_ALLOWED: ['allowedRegions'],
    COST_OVER_LIMIT: ['maxCostPerRun'],
  });
