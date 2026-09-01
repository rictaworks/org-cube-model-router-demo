import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchOnce } from '../test-support/fetchMock.js';
import { AppDataProvider, useAppData } from './AppDataContext.js';

function Probe(): ReactNode {
  const { dimensions, policies, models, loading } = useAppData();
  if (loading) {
    return <span>loading</span>;
  }
  return (
    <ul>
      <li>dimensions:{dimensions.length}</li>
      <li>policies:{policies.length}</li>
      <li>models:{models.length}</li>
    </ul>
  );
}

describe('AppDataProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('マウント時に次元・ポリシー・モデルカタログを取得する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/dimensions')) {
          return new Response(JSON.stringify({ dimensions: [{ id: 1, name: '部門', displayOrder: 1, values: [] }] }), {
            status: 200,
          });
        }
        if (url.endsWith('/api/policies')) {
          return new Response(JSON.stringify({ policies: [] }), { status: 200 });
        }
        if (url.endsWith('/api/models')) {
          return new Response(JSON.stringify({ models: [] }), { status: 200 });
        }
        throw new Error(`unexpected url: ${url}`);
      }),
    );

    render(
      <AppDataProvider>
        <Probe />
      </AppDataProvider>,
    );

    await waitFor(() => expect(screen.getByText('dimensions:1')).toBeInTheDocument());
    expect(screen.getByText('policies:0')).toBeInTheDocument();
    expect(screen.getByText('models:0')).toBeInTheDocument();
  });

  it('先に開始したが後から解決する要求（stale response）が新しい状態を上書きしない', async () => {
    let resolveFirstPolicies: ((response: Response) => void) | undefined;
    let callCount = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/dimensions')) {
          return new Response(JSON.stringify({ dimensions: [] }), { status: 200 });
        }
        if (url.endsWith('/api/models')) {
          return new Response(JSON.stringify({ models: [] }), { status: 200 });
        }
        if (url.endsWith('/api/policies')) {
          callCount += 1;
          if (callCount === 1) {
            // 1回目（初回マウント時）の応答はあえて遅延させ、2回目（明示リフレッシュ）より後に解決させる。
            return new Promise<Response>((resolve) => {
              resolveFirstPolicies = resolve;
            });
          }
          return new Response(JSON.stringify({ policies: [{ id: 1, name: '全体方針', status: 'active', priority: 0, selector: {} }] }), {
            status: 200,
          });
        }
        throw new Error(`unexpected url: ${url}`);
      }),
    );

    function PoliciesProbe(): ReactNode {
      const { policies, refreshPolicies } = useAppData();
      return (
        <div>
          <span>policies:{policies.length}</span>
          <button type="button" onClick={() => void refreshPolicies()}>
            reload
          </button>
        </div>
      );
    }

    render(
      <AppDataProvider>
        <PoliciesProbe />
      </AppDataProvider>,
    );

    // 明示リフレッシュ（2回目の要求）を先に完了させる。
    await waitFor(() => expect(screen.getByRole('button', { name: 'reload' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'reload' }));
    await waitFor(() => expect(screen.getByText('policies:1')).toBeInTheDocument());

    // その後、1回目（stale）の応答を解決させても、新しい状態(1件)を古い状態(0件)で上書きしない。
    resolveFirstPolicies?.(new Response(JSON.stringify({ policies: [] }), { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.getByText('policies:1')).toBeInTheDocument();
  });

  it('取得失敗時はエラーメッセージを保持する', async () => {
    mockFetchOnce({ message: '取得に失敗しました。' }, 500);

    function ErrorProbe(): ReactNode {
      const { error, loading } = useAppData();
      if (loading) {
        return <span>loading</span>;
      }
      return <span>{error}</span>;
    }

    render(
      <AppDataProvider>
        <ErrorProbe />
      </AppDataProvider>,
    );

    await waitFor(() => expect(screen.getByText('取得に失敗しました。')).toBeInTheDocument());
  });
});
