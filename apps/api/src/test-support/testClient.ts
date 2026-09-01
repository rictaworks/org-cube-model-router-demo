/**
 * apps/api のテストで共通利用するHTTPクライアントヘルパー。
 * Honoの `app.request()` を用いて実際のWorkers環境（Miniflare上のD1を含む）に
 * リクエストを送り、セッションCookieの授受をテストコード側で明示的に扱えるようにする。
 */
import { env } from 'cloudflare:workers';
import { SESSION_COOKIE_NAME } from '../config.js';
import { app } from '../index.js';

export interface TestResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly body: unknown;
  readonly sessionId: string | undefined;
}

function extractSessionIdFromSetCookie(headers: Headers): string | undefined {
  const setCookie = headers.get('set-cookie');
  if (setCookie === null) {
    return undefined;
  }
  const match = new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  return match?.[1];
}

export interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  readonly sessionId?: string;
  readonly body?: unknown;
}

/** アプリへリクエストを送る。bodyはオブジェクトを渡せばJSONとしてシリアライズする。 */
export async function apiRequest(path: string, init: ApiRequestInit = {}): Promise<TestResponse> {
  const headers = new Headers(init.headers);
  if (init.sessionId !== undefined) {
    headers.set('cookie', `${SESSION_COOKIE_NAME}=${init.sessionId}`);
  }

  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    if (typeof init.body === 'string') {
      body = init.body;
    } else {
      body = JSON.stringify(init.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }
  }

  const res = await app.request(path, { method: init.method, headers, body }, env);
  const text = await res.text();
  const parsedBody: unknown = text.length === 0 ? undefined : JSON.parse(text);

  return {
    status: res.status,
    headers: res.headers,
    body: parsedBody,
    sessionId: extractSessionIdFromSetCookie(res.headers) ?? init.sessionId,
  };
}

/** 新しいセッションを1件発行し、そのセッションIDを返す。 */
export async function issueSession(): Promise<string> {
  const res = await apiRequest('/api/dimensions');
  if (res.sessionId === undefined) {
    throw new Error('テストヘルパーの前提が崩れています: セッションCookieが発行されませんでした。');
  }
  return res.sessionId;
}
