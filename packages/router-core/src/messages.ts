/**
 * 文言（メッセージ・設定値）の集約ファイル。
 * requirements.md 4.9節の理由コード説明を含む。UI・ログ表示から参照する想定であり、
 * ロジック本体（candidateEvaluator.ts 等）に文字列を直書きしない方針に従う。
 */
import type { ReasonCode } from './types.js';

/** 理由コードの日本語説明（requirements.md 4.9節）。 */
export const REASON_CODE_MESSAGES: Readonly<Record<ReasonCode, string>> = Object.freeze({
  MODEL_UNAVAILABLE: 'セッション内で提供停止に設定されています。',
  POLICY_CONFLICT: '許可リージョンまたは許可プロバイダの積集合が空になっています。',
  MODEL_BANNED: '禁止モデルに含まれています。',
  PROVIDER_NOT_ALLOWED: 'プロバイダが許可されていません。',
  LOCAL_REQUIRED: 'ローカル必須の方針ですが、クラウド稼働のモデルです。',
  REGION_NOT_ALLOWED: 'モデルのリージョンが許可されていません。',
  SENSITIVITY_TRAINING: '学習利用オプトアウトに対応していません（社内以上の機密度）。',
  SENSITIVITY_RETENTION: 'ゼロリテンションに対応していません（機密以上の機密度）。',
  MODALITY_UNSUPPORTED: '画像入力に対応していません。',
  CONTEXT_EXCEEDED: '入出力トークンの見積もりがコンテキスト上限を超えています。',
  CAPABILITY_BELOW_FLOOR: 'タスクの難易度に対して能力が下限に達していません。',
  COST_OVER_LIMIT: '1実行あたりの見積もりコストが上限を超えています。',
  WARN_NO_RESIDENCY_POLICY:
    '個人情報を扱うタスクですが、所在地を制限するポリシー（許可リージョンまたはローカル必須）が設定されていません。',
  WARN_POSITION_INCOMPLETE: '組織座標に「未設定」の次元があります。全体ポリシー等のみが適用されます。',
});

/** 次元・値の名称種別（エラーメッセージの文言選択に使う）。 */
export type NamedEntityKind = 'dimension' | 'value';

const NAMED_ENTITY_LABEL: Readonly<Record<NamedEntityKind, string>> = Object.freeze({
  dimension: '次元',
  value: '値',
});

/**
 * router-core が送出する例外の文言テンプレート集。
 * ロジック本体（dimensionManager.ts 等）に文字列を直書きしない方針に従う。
 */
export const ERROR_MESSAGES = Object.freeze({
  emptyName: (kind: NamedEntityKind): string =>
    `${NAMED_ENTITY_LABEL[kind]}名を空にすることはできません。`,
  duplicateName: (kind: NamedEntityKind, name: string): string =>
    `${NAMED_ENTITY_LABEL[kind]}名「${name}」は既に使用されています。`,
  limitExceeded: (kind: NamedEntityKind, limit: number): string =>
    `${NAMED_ENTITY_LABEL[kind]}の数が上限（${limit}）を超えています。`,
  dimensionNotFound: (dimensionId: number): string => `次元ID ${dimensionId} が見つかりません。`,
  valueNotFound: (valueId: number): string => `値ID ${valueId} が見つかりません。`,
  valueInUse: (taskCount: number, policyCount: number): string =>
    `この値を参照しているタスクが${taskCount}件、ポリシーが${policyCount}件あるため削除できません。`,
  unknownOperationKind: (kind: string): string => `未知の操作種別です: ${kind}`,
  unknownModelInEvaluationRows: (modelId: string): string =>
    `モデルID「${modelId}」の評価行が見つかりません。`,
  pinnedModelRowMissing: (modelId: string): string =>
    `固定モデル「${modelId}」の評価行が見つかりません。関数Cの評価結果を先に計算してください。`,
  invalidOrder: (kind: NamedEntityKind): string =>
    `並び替え対象の${NAMED_ENTITY_LABEL[kind]}の集合が現在の一覧と一致しません。`,
});

/** ポリシーを無効化する際の定型理由（4.1節手順4）。 */
export const POLICY_DISABLED_REASONS = Object.freeze({
  dimensionDeleted: '次元削除',
});
