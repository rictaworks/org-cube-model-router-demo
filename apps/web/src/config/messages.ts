/**
 * UI文言（画面表示・ラベル・エラーメッセージ・ボタン文言等）の集約ファイル。
 * CLAUDE.md「文字列（UI文言・エラーメッセージ・ラベル等）はコードに直書きせず設定ファイルに
 * 分離する」に従う。理由コードの日本語説明は packages/router-core の REASON_CODE_MESSAGES
 * を正とし、ここでは重複定義しない（DRY）。文体はですます調で統一する（である調禁止）。
 */
import type {
  AssignmentStatus,
  ChangeKind,
  Deployment,
  Difficulty,
  LatencyClass,
  LatencyNeed,
  PolicyStatus,
  Region,
  Sensitivity,
  TaskKind,
} from '@org-cube-model-router-demo/router-core';

export const APP_NAME = '多次元組織 × タスク → 最適AIモデル マッピング デモ';

export const NAV_LABELS = Object.freeze({
  home: 'ホーム',
  dimensions: '次元管理',
  policies: 'ポリシー管理',
  tasks: 'タスク管理',
  models: 'モデルカタログ',
  assignments: '割当結果',
  changeImpacts: '変更影響',
  orgView: '組織ビュー',
});

export const COMMON_MESSAGES = Object.freeze({
  loading: '読み込み中です…',
  loadFailed: (resource: string): string => `${resource}の取得に失敗しました。`,
  retry: '再読み込み',
  save: '保存する',
  cancel: 'キャンセル',
  add: '追加する',
  edit: '編集する',
  delete: '削除する',
  close: '閉じる',
  confirm: '実行する',
  yes: 'はい',
  no: 'いいえ',
  none: '（なし）',
  unset: '未設定',
  required: '必須',
  optional: '任意',
  actions: '操作',
  saveSucceeded: '保存しました。',
  saveFailed: '保存に失敗しました。',
  deleteSucceeded: '削除しました。',
  deleteFailed: '削除に失敗しました。',
  networkError: 'サーバーへの接続に失敗しました。開発サーバーが起動しているかご確認ください。',
  unknownError: '想定外のエラーが発生しました。',
  emptyList: '対象がありません。',
  privacyNotice:
    '個人名・連絡先など個人を特定できる情報は入力しないでください。組織の役割や属性を表す名称のみをご入力ください。',
});

/**
 * Ricta Works の全デモ共通UI（アンバーバナー・デモ一覧リンク・ご相談ボタン・
 * legalページへのフッターリンク）の文言。内容は全デモ共通（demo-common-ui.md 参照）。
 */
export const DEMO_COMMON_MESSAGES = Object.freeze({
  demoVersionBanner: 'これはデモ版です。データはサーバー再起動時にリセットされる場合があります。',
  demoListLinkLabel: '← デモ一覧へ',
  consultButtonLabel: 'ご相談はこちら',
  footerLegalLinkLabel: '利用規約・免責事項・連絡先',
  footerCopyright: '© 2026 Ricta Works',
});

/**
 * /legal ページの文言。内容は全デモ共通（demo-common-ui.md 参照）。連絡先は
 * CONTRIBUTING.md の「連絡先ルール」に従いメールアドレスのみ掲載し個人名は書かない。
 */
export const LEGAL_MESSAGES = Object.freeze({
  title: '利用規約・免責事項・連絡先',
  backToHomeLabel: 'ホームに戻る',
  termsHeading: '利用規約',
  termsItems: [
    '本サービスはデモンストレーション目的のみで提供されます。商用利用・再配布は禁止します。',
    'サービスの内容は予告なく変更・停止する場合があります。',
    'セッションのデータは、前回のリセット日時がJST 03:00より前になった状態で本サービスへアクセスすると、そのタイミングで自動的に削除されます（requirements.md 4.8節）。',
    '本サービスの利用に際し、本規約に同意したものとみなします。',
  ],
  disclaimerHeading: '免責事項',
  disclaimerItems: [
    '表示される組織次元・ポリシー・タスク・AIモデルのカタログはデモ用のサンプルであり、実在の組織・契約・料金を保証するものではありません。',
    '本サービスが提示するモデル割当・根拠はルールベースの試算であり、実運用のAIモデル選定を保証するものではありません。',
    '本サービスの利用により生じた損害について、Ricta Works は一切の責任を負いません。',
    'サービスの可用性・正確性・継続性を保証しません。',
  ],
  contactHeading: '連絡先',
  contactRows: [
    { label: '屋号', value: 'Ricta Works' },
    { label: '住所', value: '〒190-0022 東京都立川市錦町1丁目4-20 TSCビル5階' },
    { label: '電話', value: '070-5148-0380' },
  ],
  contactEmailLabel: 'メール',
  contactEmailValue: 'info@rictaworks.jp',
  contactWebLabel: 'Web',
  contactWebValue: 'https://rictaworks.jp',
  contactXLabel: 'X',
  contactXValue: '@rictaworks',
  contactGithubLabel: 'GitHub',
  contactGithubValue: 'github.com/rictaworks',
});

export const HOME_MESSAGES = Object.freeze({
  title: 'ホーム',
  description:
    '組織の次元を追加し、セルにポリシーを置き、タスクを登録すると、各タスクに最適なAIモデルが割り当てられ、根拠と除外理由が表示されます。',
  sampleLoadTitle: 'サンプル組織を読み込む',
  sampleLoadDescription:
    '空のセッションであれば、見本の次元・ポリシー・タスクを一括で投入できます。まずはこちらから体験できます。',
  sampleLoadButton: 'サンプル組織を読み込む',
  sampleLoadSucceeded: (dimensionCount: number, policyCount: number, taskCount: number): string =>
    `次元${dimensionCount}件・ポリシー${policyCount}件・タスク${taskCount}件を読み込みました。`,
  sampleLoadAlreadyLoadedHint: 'セッションに既にデータがあるため、サンプル読込は利用できません。',
  quickLinksTitle: '各画面へ移動する',
  autoLoginNotice:
    'このデモは認証を持ちません。初回アクセス時にブラウザへ不透明なセッションIDが自動発行され、Cookieで保持されます。',
});

export const DIMENSIONS_MESSAGES = Object.freeze({
  title: '次元管理',
  description: '組織を区切る次元（部門・拠点など）と、各次元の値を追加・改名・削除します。',
  addDimensionTitle: '次元を追加する',
  dimensionNameLabel: '次元名',
  dimensionNamePlaceholder: '例：部門、拠点、職種区分',
  addValueTitle: '値を追加する',
  valueNameLabel: '値の名前',
  valueNamePlaceholder: '例：営業、東京、管理職',
  renameDimensionTitle: '次元名を変更する',
  renameValueTitle: '値の名前を変更する',
  deleteDimensionConfirmTitle: '次元を削除しますか？',
  deleteDimensionImpactLoading: '削除の影響を確認しています…',
  deleteDimensionImpactDescription: (affectedTaskCount: number, affectedPolicyCount: number): string =>
    `この次元を削除すると、${affectedTaskCount}件のタスクの座標が失われ、${affectedPolicyCount}件のポリシーが無効化されます（削除はされません）。`,
  deleteDimensionImpactNone: 'この次元を削除しても、タスク・ポリシーへの影響はありません。',
  deleteValueConfirmTitle: '値を削除しますか？',
  deleteValueInUseHint: 'この値を参照しているタスク・ポリシーがあるため削除できません。',
  noDimensions: '次元がまだ登録されていません。',
  noValues: '値がまだ登録されていません。',
  valuesHeading: '値一覧',
  affectedPoliciesTitle: '無効化されたポリシー',
});

export const POLICIES_MESSAGES = Object.freeze({
  title: 'ポリシー管理',
  description: '次元の値の組み合わせ（セレクタ）に対して、制約と重みを設定します。',
  addPolicyTitle: 'ポリシーを追加する',
  editPolicyTitle: 'ポリシーを編集する',
  nameLabel: 'ポリシー名',
  namePlaceholder: '例：フランクフルト拠点はEU限定',
  priorityLabel: '優先度',
  priorityHelp: '同じ特異度のポリシー間で、重みの上書き順を決めます（数値が大きいほど優先）。',
  selectorLabel: 'セレクタ（適用範囲）',
  selectorHelp: '次元ごとに特定の値を選ぶと、その値に一致するタスクにのみ適用されます。指定しない次元は任意（全体）として扱います。',
  wildcardOption: '（任意）',
  constraintsLegend: '制約（安全に関わる条件）',
  allowedRegionsLabel: '許可リージョン',
  allowedProvidersLabel: '許可プロバイダ',
  allowedProvidersPlaceholder: '例：Aster,Boreal（カンマ区切り）',
  bannedModelsLabel: '禁止モデル',
  requireLocalLabel: 'ローカル必須',
  maxCostPerRunLabel: '1実行あたりコスト上限（円）',
  weightsLegend: '重み（嗜好）',
  weightQualityLabel: '品質重み',
  weightCostLabel: 'コスト重み',
  weightLatencyLabel: '速度重み',
  weightsHelp: '未入力の項目は既定重み（品質0.5／コスト0.3／速度0.2）を継承します。',
  statusLabel: '状態',
  statusActive: '有効',
  statusDisabled: '無効',
  disabledReasonLabel: '無効化理由',
  deleteConfirmTitle: 'ポリシーを削除しますか？',
  noPolicies: 'ポリシーがまだ登録されていません。',
  specificityLabel: '特異度',
});

export const TASKS_MESSAGES = Object.freeze({
  title: 'タスク管理',
  description: 'タスクを組織座標（各次元の値）と属性とともに登録・編集・削除します。',
  addTaskTitle: 'タスクを登録する',
  editTaskTitle: 'タスクを編集する',
  nameLabel: 'タスク名',
  namePlaceholder: '例：週次レポート要約',
  positionLabel: '組織座標',
  positionHelp: '各次元について値を1つ選ぶか、未設定のままにできます。',
  taskKindLabel: '種別',
  difficultyLabel: '難易度',
  sensitivityLabel: '機密度',
  inputTokensLabel: '入力トークン見積',
  outputTokensLabel: '出力トークン見積',
  latencyNeedLabel: '応答要求',
  needsImageLabel: '画像入力',
  monthlyRunsLabel: '月間実行回数',
  deleteConfirmTitle: 'タスクを削除しますか？',
  noTasks: 'タスクがまだ登録されていません。',
  viewAssignment: '割当・根拠を見る',
  limitExceededHint: (limit: number): string => `タスクの数が上限（${limit}件）に達しています。`,
});

export const MODELS_MESSAGES = Object.freeze({
  title: 'モデルカタログ',
  description: '内蔵のモデルカタログを閲覧し、セッション内でモデルの提供停止を切り替えます。',
  columnModel: 'モデル',
  columnProvider: 'プロバイダ',
  columnDeployment: '稼働形態',
  columnRegion: 'リージョン',
  columnContext: 'コンテキスト上限',
  columnLatency: '速度クラス',
  columnImage: '画像入力',
  columnPrice: '単価（円／1,000トークン）',
  columnAvailability: '提供状況',
  availableLabel: '提供中',
  unavailableLabel: '提供停止',
  toggleToUnavailable: '提供停止にする',
  toggleToAvailable: '提供再開する',
  priceFormat: (priceIn: number, priceOut: number): string => `入力 ${priceIn} ／ 出力 ${priceOut}`,
});

export const ASSIGNMENTS_MESSAGES = Object.freeze({
  title: '割当結果',
  description: '各タスクについて、有効ポリシーを解決し制約で絞り込んだうえで採用モデルを表示します。',
  columnTask: 'タスク',
  columnStatus: '状態',
  columnModel: '採用モデル',
  columnCost: '見積もりコスト（円）',
  columnMonthlyCost: '月間コスト見積（円）',
  unassignedHighlight: '未割当のため対応が必要です。',
  pinViolatedHighlight: '固定違反のため対応が必要です。',
  noAssignments: 'タスクがまだ登録されていないため、割当結果はありません。',
  viewRationale: '根拠を見る',
  goToTask: 'タスクを編集する',
  goToPolicies: 'ポリシーを確認する',
});

export const ASSIGNMENT_DETAIL_MESSAGES = Object.freeze({
  title: '割当・根拠',
  backToList: '割当結果一覧に戻る',
  columnModel: 'モデル',
  adoptedModelTitle: '採用モデル',
  noAdoptedModel: '採用されたモデルはありません。',
  scoreBreakdownTitle: '得点内訳',
  scoreQuality: '品質得点',
  scoreCost: 'コスト得点',
  scoreLatency: '速度得点',
  scoreTotal: '総合得点',
  runnersUpTitle: '次点候補',
  noRunnersUp: '次点候補はありません。',
  excludedModelsTitle: '除外モデルと理由',
  noExcludedModels: '除外されたモデルはありません。',
  appliedPoliciesTitle: '適用ポリシー',
  noAppliedPolicies: '適用されたポリシーはありません（全体の既定値のみが適用されています）。',
  warningsTitle: '警告',
  noWarnings: '警告はありません。',
  contributingPoliciesLabel: '寄与ポリシー（候補）：',
  contributingPoliciesNote:
    'この一覧は、適用ポリシーのうち当該制約項目に値を設定しているものを候補として示しています。制約を複数のポリシーが持つ場合、最終的に効いたポリシーを一意に特定できないことがあります。',
  contributingPoliciesNone: '関連する適用ポリシーはありません（タスク属性・提供停止設定によるものです）。',
  pinSectionTitle: '固定割当',
  pinnedLabel: '固定中のモデル',
  pinSelectLabel: '固定するモデルを選ぶ',
  pinButton: '固定する',
  unpinButton: '固定を解除する',
  pinSucceeded: '固定しました。',
  pinRejected: '固定を受理できませんでした。制約を満たしていません。',
  unpinSucceeded: '固定を解除しました。',
  pinViolationTitle: '固定違反',
  pinViolationDescription: '固定したモデルが、後の変更により除外されました。固定の解除、またはポリシー・提供停止設定の見直しをご検討ください。',
  computedAtLabel: '計算日時：',
});

export const CHANGE_IMPACTS_MESSAGES = Object.freeze({
  title: '変更影響',
  description: '直近の変更操作で採用モデルまたは状態が変わったタスクの一覧です。',
  columnChangeKind: '変更種別',
  columnTask: 'タスク',
  columnBefore: '変更前',
  columnAfter: '変更後',
  noChangeImpacts: '直近の変更による影響はありません。',
  viewDetail: '詳細を見る',
});

export const ORG_VIEW_MESSAGES = Object.freeze({
  title: '組織ビュー',
  description: '任意の2次元を縦横に選び、各セルのタスク数・採用モデルの内訳・未割当数を確認します。',
  rowDimensionLabel: '行の次元',
  colDimensionLabel: '列の次元（任意）',
  colDimensionNone: '（選択しない）',
  singleModeNotice: '次元が1個以下のため、1次元の一覧表示に切り替えています。',
  taskCountLabel: 'タスク数',
  unassignedCountLabel: '未割当',
  pinViolatedCountLabel: '固定違反',
  modelBreakdownLabel: 'モデル内訳',
  noDimensions: '次元が登録されていないため、全体集計のみを表示します。',
});

export const MODAL_MESSAGES = Object.freeze({
  closeButtonLabel: '閉じる',
});

export const TOAST_MESSAGES = Object.freeze({
  dismiss: '閉じる',
});

export const TASK_KIND_LABELS: Readonly<Record<TaskKind, string>> = Object.freeze({
  summarize: '要約',
  translate: '翻訳',
  classify: '分類',
  extract: '抽出',
  codegen: 'コード生成',
  dialogue: '対話応答',
  reasoning: '推論',
});

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = Object.freeze({
  low: '低',
  medium: '中',
  high: '高',
});

export const SENSITIVITY_LABELS: Readonly<Record<Sensitivity, string>> = Object.freeze({
  public: '公開',
  internal: '社内',
  confidential: '機密',
  personal: '個人情報',
});

export const LATENCY_NEED_LABELS: Readonly<Record<LatencyNeed, string>> = Object.freeze({
  interactive: '対話',
  batch: 'バッチ',
});

export const REGION_LABELS: Readonly<Record<Region, string>> = Object.freeze({
  JP: '日本（JP）',
  US: '米国（US）',
  EU: '欧州（EU）',
});

export const DEPLOYMENT_LABELS: Readonly<Record<Deployment, string>> = Object.freeze({
  cloud: 'クラウド',
  local: 'ローカル',
});

export const LATENCY_CLASS_LABELS: Readonly<Record<LatencyClass, string>> = Object.freeze({
  fast: '高速',
  standard: '標準',
  slow: '低速',
});

export const ASSIGNMENT_STATUS_LABELS: Readonly<Record<AssignmentStatus, string>> = Object.freeze({
  assigned: '割当済',
  unassigned: '未割当',
  pinned: '固定',
  pin_violated: '固定違反',
});

export const CHANGE_KIND_LABELS: Readonly<Record<ChangeKind, string>> = Object.freeze({
  dimension: '次元の変更',
  policy: 'ポリシーの変更',
  task: 'タスクの変更',
  model_override: '提供停止の変更',
  sample_load: 'サンプル読込',
});

export const POLICY_STATUS_LABELS: Readonly<Record<PolicyStatus, string>> = Object.freeze({
  active: '有効',
  disabled: '無効',
});
