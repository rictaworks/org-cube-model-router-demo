/**
 * apps/api エントリポイント。
 *
 * ミドルウェアの適用順（外側→内側）：
 * 1. honeypotMiddleware：Botのリクエストを即座に破棄する（requirements.md 13.4節）
 * 2. sessionMiddleware：セッションの発行・復元・日次リセット（requirements.md 4.8・13.3節）
 * 3. catalogSeedMiddleware：モデルカタログ（マスタデータ）の遅延シード
 *
 * 想定内例外→HTTPステータス変換は Hono の compose() の仕様上、各ミドルウェアの
 * try/catch ではなく app.onError（下記）でまとめて行う（compose() は
 * onError が設定されている場合、ハンドラの例外を最も内側のdispatchで捕捉し
 * 直接 onError を呼ぶため、外側ミドルウェアの try/catch へは伝播しない）。
 */
import { Hono } from 'hono';
import { API_MESSAGES } from './config.js';
import { mapKnownErrorToHttp } from './errors.js';
import { catalogSeedMiddleware, honeypotMiddleware, sessionMiddleware } from './middleware.js';
import { assignmentsRouter, taskAssignmentRouter } from './routes/assignments.js';
import { changeImpactsRouter } from './routes/changeImpacts.js';
import { dimensionsRouter } from './routes/dimensions.js';
import { modelsRouter } from './routes/models.js';
import { orgViewRouter } from './routes/orgView.js';
import { pinRouter } from './routes/pin.js';
import { policiesRouter } from './routes/policies.js';
import { sampleRouter } from './routes/sample.js';
import { tasksRouter } from './routes/tasks.js';
import type { AppEnv } from './types.js';

export const app = new Hono<AppEnv>();

app.use('*', honeypotMiddleware());
app.use('*', sessionMiddleware());
app.use('*', catalogSeedMiddleware());

// F1：次元管理
app.route('/api/dimensions', dimensionsRouter);
// F2：ポリシー管理
app.route('/api/policies', policiesRouter);
// F3：タスク管理
app.route('/api/tasks', tasksRouter);
// F6：根拠表示（タスク単位）
app.route('/api/tasks', taskAssignmentRouter);
// F7：固定割当・解除
app.route('/api/tasks', pinRouter);
// F4：モデルカタログ閲覧・提供停止切替
app.route('/api/models', modelsRouter);
// F5：割当計算の結果一覧
app.route('/api/assignments', assignmentsRouter);
// F8：変更影響取得
app.route('/api/change-impacts', changeImpactsRouter);
// F9：組織ビュー
app.route('/api/org-view', orgViewRouter);
// F10：サンプル読込
app.route('/api/sample', sampleRouter);

app.onError((err, c) => {
  try {
    const mapped = mapKnownErrorToHttp(err);
    console.error(`[error] path=${c.req.path} status=${mapped.status} message=${mapped.message}`);
    return c.json({ message: mapped.message }, mapped.status);
  } catch (unknownError) {
    console.error(`[unhandled] path=${c.req.path} error=${String(unknownError)}`);
    return c.json({ message: API_MESSAGES.unknownError }, 500);
  }
});

export default app;
