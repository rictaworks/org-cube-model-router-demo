/**
 * apps/api の設定値・文言の集約ファイル。
 *
 * CLAUDE.md「文字列（メッセージ・設定値）はコードに直書きせず設定ファイルに分離する」に
 * 従い、ハンドラ・ミドルウェア本体に文字列・定数を直書きしない。
 * ロジック本体の定数（次元数上限・タスク数上限等）は packages/router-core の
 * constants.ts を正とし、ここでは重複定義しない（DRY）。
 */

/** セッションIDを保持するCookie名（requirements.md 13.3節）。 */
export const SESSION_COOKIE_NAME = 'session_id';

/** セッションCookieの有効期間（秒）。認証を持たないため長期に保持する。 */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * ハニーポット項目のフィールド名（requirements.md 13.4節）。
 * フロントエンドのフォームはこの名前の入力欄を不可視で配置し、Botが埋めた場合のみ
 * 値が入る想定とする。
 */
export const HONEYPOT_FIELD_NAME = 'contact_note';

/** 日次リセットの基準時刻（JST・時）（requirements.md 4.8節）。 */
export const DAILY_RESET_HOUR_JST = 3;

/** JSTとUTCの差（分）。 */
export const JST_OFFSET_MINUTES = 9 * 60;

export const API_MESSAGES = Object.freeze({
  requestRejected: 'リクエストを処理できませんでした。',
  sessionInitFailed: 'セッションの初期化に失敗しました。',
  invalidJsonBody: 'リクエスト本文がJSONとして解釈できません。',
  notFound: (resource: string): string => `${resource}が見つかりません。`,
  dimensionNotFound: '指定した次元が見つかりません。',
  valueNotFound: '指定した値が見つかりません。',
  policyNotFound: '指定したポリシーが見つかりません。',
  taskNotFound: '指定したタスクが見つかりません。',
  modelNotFound: '指定したモデルが見つかりません。',
  assignmentNotFound: '指定したタスクの割当がまだ計算されていません。',
  invalidSelectorDimension: (dimensionId: number): string =>
    `セレクタが参照する次元ID ${dimensionId} は存在しません。`,
  invalidSelectorValue: (valueId: number): string => `セレクタが参照する値ID ${valueId} は存在しません。`,
  /** セレクタ自体の形状（次元ID→値IDのオブジェクトであること）が不正な場合。 */
  invalidSelectorShape: 'セレクタの形式が不正です（次元ID→値IDのオブジェクトで指定してください）。',
  invalidPositionDimension: (dimensionId: number): string =>
    `組織座標が参照する次元ID ${dimensionId} は存在しません。`,
  invalidPositionValue: (valueId: number): string => `組織座標が参照する値ID ${valueId} は存在しません。`,
  policyLimitExceeded: (limit: number): string => `ポリシーの数が上限（${limit}）を超えています。`,
  taskLimitExceeded: (limit: number): string => `タスクの数が上限（${limit}）を超えています。`,
  sampleAlreadyLoaded:
    'セッションに既にデータが存在するため、サンプルは読み込めません。空のセッションでのみ実行できます。',
  invalidTaskKind: '種別の値が不正です。',
  invalidDifficulty: '難易度の値が不正です。',
  invalidSensitivity: '機密度の値が不正です。',
  invalidLatencyNeed: '応答要求の値が不正です。',
  invalidTokenRange: (field: string, min: number, max: number): string =>
    `${field}は${min}〜${max}の範囲で指定してください。`,
  /** タスクの入力トークン見積が範囲外の場合。フィールドラベルはここに集約する（CLAUDE.md：文字列の直書き禁止）。 */
  invalidInputTokenRange: (min: number, max: number): string =>
    `入力トークン見積は${min}〜${max}の範囲で指定してください。`,
  /** タスクの出力トークン見積が範囲外の場合。 */
  invalidOutputTokenRange: (min: number, max: number): string =>
    `出力トークン見積は${min}〜${max}の範囲で指定してください。`,
  /** タスクの月間実行回数が範囲外の場合。 */
  invalidMonthlyRunsRange: (min: number, max: number): string =>
    `月間実行回数は${min}〜${max}の範囲で指定してください。`,
  invalidRegion: 'リージョンの値が不正です（JP・US・EUのいずれか）。',
  invalidWeight: '重みは0以上の数値で指定してください。',
  invalidMaxCostPerRun: 'コスト上限は0以上の数値で指定してください。',
  invalidPriority: '優先度は整数で指定してください。',
  invalidName: '名称を空にすることはできません。',
  /** モデルの提供停止フラグ（unavailable）が真偽値でない場合。 */
  invalidUnavailableFlag: '提供停止フラグの値が不正です（true/falseで指定してください）。',
  /** タスクの画像対応要否（needsImage）が真偽値でない場合。 */
  invalidNeedsImage: '画像対応要否の値が不正です（true/falseで指定してください）。',
  /** ポリシーの許可プロバイダ（allowedProviders）が文字列配列でない場合。 */
  invalidAllowedProviders: '許可プロバイダの指定が不正です（文字列の配列で指定してください）。',
  /** ポリシーの禁止モデル（bannedModels）が文字列配列でない場合。 */
  invalidBannedModels: '禁止モデルの指定が不正です（文字列の配列で指定してください）。',
  /** ポリシーのローカル必須フラグ（requireLocal）が真偽値でない場合。 */
  invalidRequireLocal: 'ローカル必須フラグの値が不正です（true/falseで指定してください）。',
  invalidOrgViewDimension: '組織ビューの次元指定が不正です。',
  unknownError: '想定外のエラーが発生しました。',
  pinRejected: '固定を受理できませんでした。指定したモデルは制約を満たしていません。',
  /** F10：サンプル読込のフィクスチャ整合性エラー（data/sample_org.json の内部不整合）。 */
  fixtureInconsistencyError: (dimensionName: string, valueName: string): string =>
    `サンプルデータの整合性エラー: 次元「${dimensionName}」の値「${valueName}」が見つかりません。`,
} as const);
