/**
 * テスト用の `fetch` モックヘルパー。apps/web は apps/api を呼び出すのみで、実際の
 * ネットワーク呼び出しをVitest（jsdom環境）で行わないため、`global.fetch` を差し替える。
 */
import { vi } from 'vitest';

export interface MockedFetchCall {
  readonly input: string;
  readonly init: RequestInit | undefined;
}

/** 指定したJSONボディ・ステータスを返す `fetch` モックを設定する。呼び出し履歴を返す。 */
export function mockFetchOnce(body: unknown, status = 200): MockedFetchCall[] {
  const calls: MockedFetchCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input: String(input), init });
    return new Response(body === undefined ? '' : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

export interface FetchRoute {
  readonly method: string;
  readonly match: RegExp;
  readonly body: unknown;
  readonly status?: number;
}

/**
 * メソッド・パスの組み合わせでレスポンスを振り分ける `fetch` モックを設定する。
 * 複数のAPI呼び出し（例：AppDataProvider の初期取得＋画面固有のAPI）が絡む
 * ページ単位のテストで使う。一致するルートが無ければ例外を投げる
 * （CLAUDE.md：フォールバック禁止。テストの想定漏れを握りつぶさない）。
 */
export function mockFetchRoutes(routes: readonly FetchRoute[]): MockedFetchCall[] {
  const calls: MockedFetchCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ input: url, init });
    const route = routes.find((candidate) => candidate.method === method && candidate.match.test(url));
    if (route === undefined) {
      throw new Error(`mockFetchRoutes: 一致するルートがありません: ${method} ${url}`);
    }
    return new Response(route.body === undefined ? '' : JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

/** 呼び出しごとに異なるレスポンスを順番に返す `fetch` モックを設定する。 */
export function mockFetchSequence(responses: readonly { readonly body: unknown; readonly status?: number }[]): MockedFetchCall[] {
  const calls: MockedFetchCall[] = [];
  let index = 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input: String(input), init });
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    if (response === undefined) {
      throw new Error('mockFetchSequence: レスポンスが設定されていません。');
    }
    return new Response(response.body === undefined ? '' : JSON.stringify(response.body), {
      status: response.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}
