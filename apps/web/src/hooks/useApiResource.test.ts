import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client.js';
import { useApiResource } from './useApiResource.js';

describe('useApiResource', () => {
  it('マウント時にfetcherを呼び出し、成功したらdataを保持する', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => useApiResource(fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ value: 1 });
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('失敗時はApiErrorのmessageをerrorへ設定する', async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError('取得に失敗しました。', 500));
    const { result } = renderHook(() => useApiResource(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('取得に失敗しました。');
    expect(result.current.data).toBeNull();
  });

  it('reload()呼び出しでfetcherが再実行される', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => useApiResource(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.reload());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
