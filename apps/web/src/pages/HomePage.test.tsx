import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { HomePage } from './HomePage.js';

const EMPTY_APP_DATA_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
];

describe('HomePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('空のセッションではサンプル読込ボタンを表示する', async () => {
    mockFetchRoutes(EMPTY_APP_DATA_ROUTES);
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('button', { name: /サンプル組織を読み込む/ })).toBeInTheDocument();
  });

  it('サンプル読込ボタン押下でPOST /api/sample/loadを呼び、成功トーストを表示する', async () => {
    const calls = mockFetchRoutes([
      ...EMPTY_APP_DATA_ROUTES,
      { method: 'POST', match: /\/api\/sample\/load$/, body: { loaded: true, dimensionCount: 3, policyCount: 6, taskCount: 12, changeImpactCount: 12 } },
    ]);
    renderWithProviders(<HomePage />);

    const button = await screen.findByRole('button', { name: /サンプル組織を読み込む/ });
    await userEvent.click(button);

    expect(await screen.findByText('次元3件・ポリシー6件・タスク12件を読み込みました。')).toBeInTheDocument();
    const sampleLoadCall = calls.find((call) => call.input.includes('/api/sample/load'));
    expect(sampleLoadCall).toBeDefined();
    expect(sampleLoadCall?.init?.method).toBe('POST');
  });

  it('各画面への導線リンクを表示する', async () => {
    mockFetchRoutes(EMPTY_APP_DATA_ROUTES);
    renderWithProviders(<HomePage />);

    await waitFor(() => expect(screen.getByRole('link', { name: '次元管理' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: '割当結果' })).toHaveAttribute('href', '/assignments');
  });
});
