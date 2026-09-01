/**
 * 各画面共通の「APIから一覧・詳細を取得し、読み込み中／エラー状態を管理する」処理を
 * 1箇所に集約するフック（DRY）。状態管理ライブラリは導入せず、Reactの標準フックのみで
 * 賄う（ミッション本文の技術方針：状態管理ライブラリ等の追加導入は必要最小限にする）。
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client.js';
import { COMMON_MESSAGES } from '../config/messages.js';

export interface ApiResourceState<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
}

export function useApiResource<T>(fetcher: () => Promise<T>): ApiResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        const message = caught instanceof ApiError ? caught.message : COMMON_MESSAGES.unknownError;
        console.error(`[useApiResource] load failed message=${message}`);
        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // fetcher は呼び出し側で useCallback により安定化させる想定。reloadToken の変化のみで再実行する。
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, loading, error, reload };
}
