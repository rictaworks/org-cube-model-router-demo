/**
 * packages/router-core の公開API。
 *
 * 外部I/O（DB・HTTP）を一切持たない純粋関数群（requirements.md 4章 関数A〜F）と、
 * それらが用いる型定義・定数・理由コード・文言を再エクスポートする。
 */

// 型定義（4.9・4.10節）
export * from './types.js';

// 定数・理由コード・文言
export * from './constants.js';
export * from './reasonCodes.js';
export * from './messages.js';

// 例外
export * from './errors.js';

// 関数A：次元管理
export * from './dimensionManager.js';

// 関数B：有効ポリシー解決
export * from './policyResolver.js';

// 関数C：候補評価・採点
export * from './candidateEvaluator.js';

// 関数D：割当決定
export * from './assignmentDecider.js';

// 関数E：再計算・変更影響
export * from './recompute.js';

// 関数F：固定割当
export * from './pinner.js';
