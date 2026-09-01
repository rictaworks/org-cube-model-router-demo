/**
 * 次元・ポリシー・モデルカタログは複数の画面（タスク管理・ポリシー管理・割当根拠・
 * 組織ビュー等）から横断的に参照するため、コンテキストでキャッシュし重複フェッチを
 * 避ける（状態管理ライブラリの追加導入は必要最小限にする方針のため、標準の
 * Context APIのみで賄う：ミッション本文の技術方針）。書き込み系操作のたびに
 * 各画面が `refreshDimensions` 等を呼んで最新化する。
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Dimension, Policy } from '@org-cube-model-router-demo/router-core';
import { fetchDimensions } from '../api/dimensions.js';
import { fetchPolicies } from '../api/policies.js';
import { fetchModels } from '../api/models.js';
import type { ModelWithAvailability } from '../api/types.js';
import { ApiError } from '../api/client.js';

interface AppDataContextValue {
  readonly dimensions: readonly Dimension[];
  readonly policies: readonly Policy[];
  readonly models: readonly ModelWithAvailability[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refreshDimensions: () => Promise<void>;
  readonly refreshPolicies: () => Promise<void>;
  readonly refreshModels: () => Promise<void>;
  readonly refreshAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

/**
 * 同一リソースへの取得要求が並行して発生した場合（React StrictModeでのマウント時
 * 二重実行、初回取得中に利用者が別の変更操作を行って追加のリフレッシュが走る場合等）、
 * 先に開始したが後から解決した要求（stale response）が、後に開始し先に解決した
 * 新しい応答を上書きしてしまう競合状態を防ぐためのガード。
 * `latestAppliedIdRef` には「これまでに状態へ反映した要求のうち最大のID」を持ち、
 * 自分より新しい要求が既に反映済みであれば、自分の応答は破棄する。
 */
function useStaleResponseGuard(): { readonly issue: () => number; readonly shouldApply: (requestId: number) => boolean } {
  const nextIdRef = useRef(0);
  const latestAppliedIdRef = useRef(0);

  const issue = useCallback((): number => {
    nextIdRef.current += 1;
    return nextIdRef.current;
  }, []);

  const shouldApply = useCallback((requestId: number): boolean => {
    if (requestId < latestAppliedIdRef.current) {
      return false;
    }
    latestAppliedIdRef.current = requestId;
    return true;
  }, []);

  return useMemo(() => ({ issue, shouldApply }), [issue, shouldApply]);
}

export function AppDataProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const [dimensions, setDimensions] = useState<readonly Dimension[]>([]);
  const [policies, setPolicies] = useState<readonly Policy[]>([]);
  const [models, setModels] = useState<readonly ModelWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dimensionsGuard = useStaleResponseGuard();
  const refreshDimensions = useCallback(async () => {
    const requestId = dimensionsGuard.issue();
    const response = await fetchDimensions();
    if (dimensionsGuard.shouldApply(requestId)) {
      setDimensions(response.dimensions);
    }
  }, [dimensionsGuard]);

  const policiesGuard = useStaleResponseGuard();
  const refreshPolicies = useCallback(async () => {
    const requestId = policiesGuard.issue();
    const response = await fetchPolicies();
    if (policiesGuard.shouldApply(requestId)) {
      setPolicies(response.policies);
    }
  }, [policiesGuard]);

  const modelsGuard = useStaleResponseGuard();
  const refreshModels = useCallback(async () => {
    const requestId = modelsGuard.issue();
    const response = await fetchModels();
    if (modelsGuard.shouldApply(requestId)) {
      setModels(response.models);
    }
  }, [modelsGuard]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([refreshDimensions(), refreshPolicies(), refreshModels()]);
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      console.error(`[AppDataContext] refreshAll failed message=${message}`);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [refreshDimensions, refreshPolicies, refreshModels]);

  const hasBootstrappedRef = useRef(false);
  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // requirements.md 13.3節：初回アクセス時にセッションCookieを発行する。ブラウザに
      // まだCookieが無い状態で複数のリクエストを並行送信すると、各リクエストが
      // それぞれ別のセッションを新規発行してしまい、どの応答が最後にCookieを上書きするかが
      // 非決定的になる（セッション分裂）。そのため、アプリ起動時最初の1件（次元取得）だけを
      // 先に完了させてセッションCookieを確定させてから、残りを並行取得する。
      await refreshDimensions();
      await Promise.all([refreshPolicies(), refreshModels()]);
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      console.error(`[AppDataContext] bootstrap failed message=${message}`);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [refreshDimensions, refreshPolicies, refreshModels]);

  // 初回マウント時のみ実行する。React StrictMode（開発時）のマウント時二重実行でも
  // セッション確定シーケンスを1回しか走らせないよう ref で防御する。
  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return;
    }
    hasBootstrappedRef.current = true;
    void bootstrap();
  }, [bootstrap]);

  const value = useMemo<AppDataContextValue>(
    () => ({ dimensions, policies, models, loading, error, refreshDimensions, refreshPolicies, refreshModels, refreshAll }),
    [dimensions, policies, models, loading, error, refreshDimensions, refreshPolicies, refreshModels, refreshAll],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const value = useContext(AppDataContext);
  if (value === null) {
    throw new Error('useAppData は AppDataProvider の内側でのみ使用できます。');
  }
  return value;
}
