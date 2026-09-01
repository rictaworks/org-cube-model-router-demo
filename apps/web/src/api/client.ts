/**
 * apps/api 呼び出しの共通クライアント。requirements.md 13.3節のセッションCookieを
 * 前提に `credentials: 'include'` で呼び出す。割当ロジックの再実装は行わず、
 * apps/api のレスポンスをそのまま型付けして返す（ミッション「apps/api を呼び出すのみ」）。
 * 処理の外部境界（HTTP呼び出し）の分岐点にログを残す（CLAUDE.md）。
 */
import { API_BASE_PATH, HONEYPOT_FIELD_NAME } from '../config/constants.js';
import { COMMON_MESSAGES } from '../config/messages.js';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** apps/api がエラー時に返すレスポンス本体（apps/api/src/errors.ts の変換結果）。 */
export interface ApiErrorBody {
  readonly message?: string;
  readonly reasonCodes?: readonly string[];
}

/** apps/api 呼び出しの失敗（ネットワークエラー・4xx/5xxの両方）を表す例外。 */
export class ApiError extends Error {
  readonly status: number;
  readonly reasonCodes: readonly string[];

  constructor(message: string, status: number, reasonCodes: readonly string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.reasonCodes = reasonCodes;
  }
}

export interface ApiRequestOptions {
  readonly method?: HttpMethod;
  readonly body?: Record<string, unknown>;
}

/**
 * requirements.md 13.4節のハニーポット項目を書き込み系リクエストへ付与する。
 * 通常の利用者は値を入力しないため常に空文字を送る（apps/api の isHoneypotTriggered は
 * 値が入っている場合のみ弾く）。
 */
function withHoneypot(body: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (body === undefined) {
    return undefined;
  }
  return { ...body, [HONEYPOT_FIELD_NAME]: '' };
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return undefined;
  }
  return JSON.parse(text) as unknown;
}

/** apps/api への1リクエストを送信し、JSONレスポンスを型付けして返す。 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const body = withHoneypot(options.body);
  console.log(`[api] request method=${method} path=${path}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    console.error(`[api] network error method=${method} path=${path} error=${String(error)}`);
    throw new ApiError(COMMON_MESSAGES.networkError, 0);
  }

  const data = await parseJsonBody(response);

  if (!response.ok) {
    const errorBody = data as ApiErrorBody | undefined;
    const message = errorBody?.message ?? COMMON_MESSAGES.unknownError;
    console.error(`[api] error method=${method} path=${path} status=${response.status} message=${message}`);
    throw new ApiError(message, response.status, errorBody?.reasonCodes ?? []);
  }

  return data as T;
}
