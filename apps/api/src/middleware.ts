/**
 * Hono用ミドルウェア一式：ハニーポット→セッション（発行・日次リセット）→
 * モデルカタログの遅延シードの順に適用する（外部境界の入口で判定するため、
 * ハニーポットを最初に置きDBアクセス前にBotのリクエストを破棄する）。
 */
import type { MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { API_MESSAGES, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from './config.js';
import { ensureCatalogSeeded } from './repositories/catalogRepository.js';
import { isHoneypotTriggered } from './honeypot.js';
import { bootstrapSession } from './session.js';
import type { AppEnv } from './types.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * 本番相当（HTTPS）でのアクセスかを判定する（CLAUDE.md「環境判定」）。
 * `wrangler dev` 等のローカル開発はHTTPで待ち受けるため、Cookieの Secure 属性を
 * 常時trueにすると開発環境でCookieが送信されず動作確認できなくなる。
 * リクエストのプロトコルから判定することで、環境変数の追加なしに安全側へ倒す。
 */
function isProductionRequest(requestUrl: string): boolean {
  return new URL(requestUrl).protocol === 'https:';
}

/** ハニーポット判定（requirements.md 13.4節）。値が入っていれば400で即座に破棄する。 */
export function honeypotMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!MUTATING_METHODS.has(c.req.method)) {
      await next();
      return;
    }

    const rawBody = await c.req.text();
    if (rawBody.trim().length === 0) {
      c.set('parsedBody', {});
      await next();
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch (error) {
      console.error(`[request] invalid JSON body path=${c.req.path} method=${c.req.method} error=${String(error)}`);
      return c.json({ message: API_MESSAGES.invalidJsonBody }, 400);
    }

    if (isHoneypotTriggered(parsed)) {
      console.error(`[honeypot] request rejected method=${c.req.method} path=${c.req.path}`);
      return c.json({ message: API_MESSAGES.requestRejected }, 400);
    }

    c.set('parsedBody', parsed);
    await next();
  };
}

/** セッションの発行・復元とリクエスト受付時の日次リセット判定（requirements.md 4.8・13.3節）。 */
export function sessionMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const cookieSessionId = getCookie(c, SESSION_COOKIE_NAME);
    const result = await bootstrapSession(c.env.DB, cookieSessionId, new Date());

    if (cookieSessionId === undefined || result.isNew) {
      setCookie(c, SESSION_COOKIE_NAME, result.sessionId, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: isProductionRequest(c.req.url),
        path: '/',
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
      });
    }

    c.set('sessionId', result.sessionId);
    await next();
  };
}

/** モデルカタログ（マスタデータ）の遅延シード（requirements.md 4.8節：日次リセット対象外）。 */
export function catalogSeedMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    await ensureCatalogSeeded(c.env.DB);
    await next();
  };
}
