import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchOnce } from '../test-support/fetchMock.js';
import { ApiError, apiRequest } from './client.js';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GETリクエストを /api 配下・credentials include で送信し、JSONを返す', async () => {
    const calls = mockFetchOnce({ dimensions: [] });

    const result = await apiRequest<{ dimensions: unknown[] }>('/dimensions');

    expect(result).toEqual({ dimensions: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe('/api/dimensions');
    expect(calls[0]?.init?.credentials).toBe('include');
    expect(calls[0]?.init?.method).toBe('GET');
  });

  it('書き込み系リクエストのボディへハニーポット項目を空文字で付与する', async () => {
    const calls = mockFetchOnce({ dimension: { id: 1, name: '部門' } }, 201);

    await apiRequest('/dimensions', { method: 'POST', body: { name: '部門' } });

    const sentBody = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;
    expect(sentBody.name).toBe('部門');
    expect(sentBody.contact_note).toBe('');
  });

  it('4xxレスポンスは message・reasonCodes を含む ApiError を送出する', async () => {
    mockFetchOnce({ message: '固定を受理できませんでした。', reasonCodes: ['MODEL_BANNED'] }, 409);

    await expect(apiRequest('/tasks/1/pin', { method: 'POST', body: { modelId: 'x' } })).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      reasonCodes: ['MODEL_BANNED'],
    });
  });

  it('ネットワークエラー時はstatus 0の ApiError を送出する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down');
      }),
    );

    await expect(apiRequest('/dimensions')).rejects.toBeInstanceOf(ApiError);
    await expect(apiRequest('/dimensions')).rejects.toMatchObject({ status: 0 });
  });
});
