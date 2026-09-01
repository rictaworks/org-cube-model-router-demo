import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { ChangeImpactsPage } from './ChangeImpactsPage.js';

const BASE_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
];

describe('ChangeImpactsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('変更前→変更後の一覧を表示する', async () => {
    mockFetchRoutes([
      ...BASE_ROUTES,
      {
        method: 'GET',
        match: /\/api\/change-impacts$/,
        body: {
          changeImpacts: [
            {
              id: 1,
              changeKind: 'policy',
              taskId: 4,
              taskName: 'タスクA',
              beforeModelId: 'aster-l',
              beforeStatus: 'assigned',
              afterModelId: null,
              afterStatus: 'unassigned',
              computedAt: '2026-09-02T00:00:00.000Z',
            },
          ],
        },
      },
    ]);

    renderWithProviders(<ChangeImpactsPage />);

    expect(await screen.findByText('タスクA')).toBeInTheDocument();
    expect(screen.getByText('ポリシーの変更')).toBeInTheDocument();
    expect(screen.getByText('aster-l（割当済）')).toBeInTheDocument();
    expect(screen.getByText('未割当')).toBeInTheDocument();
  });

  it('変更影響がなければ空状態メッセージを表示する', async () => {
    mockFetchRoutes([...BASE_ROUTES, { method: 'GET', match: /\/api\/change-impacts$/, body: { changeImpacts: [] } }]);

    renderWithProviders(<ChangeImpactsPage />);

    expect(await screen.findByText('直近の変更による影響はありません。')).toBeInTheDocument();
  });
});
