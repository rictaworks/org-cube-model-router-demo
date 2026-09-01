import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { OrgViewPage } from './OrgViewPage.js';

describe('OrgViewPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('次元が0個のときは全体集計（mode=none）を表示する', async () => {
    mockFetchRoutes([
      { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [] } },
      { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
      { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
      { method: 'GET', match: /\/api\/org-view$/, body: { mode: 'none', overall: { taskCount: 5, unassignedCount: 1, pinViolatedCount: 0, byModel: {} } } },
    ]);

    renderWithProviders(<OrgViewPage />);

    expect(await screen.findByText('次元が登録されていないため、全体集計のみを表示します。')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('次元が2個以上あればクロス集計表を表示する', async () => {
    mockFetchRoutes([
      {
        method: 'GET',
        match: /\/api\/dimensions$/,
        body: {
          dimensions: [
            { id: 1, name: '部門', displayOrder: 1, values: [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }] },
            { id: 2, name: '拠点', displayOrder: 2, values: [{ id: 20, dimensionId: 2, name: '東京', displayOrder: 1 }] },
          ],
        },
      },
      { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
      { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
      {
        method: 'GET',
        match: /\/api\/org-view/,
        body: {
          mode: 'cross',
          rowDimension: { id: 1, name: '部門', values: [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }] },
          colDimension: { id: 2, name: '拠点', values: [{ id: 20, dimensionId: 2, name: '東京', displayOrder: 1 }] },
          table: [
            {
              rowValueId: 10,
              cells: [
                { colValueId: 20, taskCount: 2, unassignedCount: 1, pinViolatedCount: 0, byModel: { 'aster-l': 1 } },
                { colValueId: null, taskCount: 0, unassignedCount: 0, pinViolatedCount: 0, byModel: {} },
              ],
            },
            { rowValueId: null, cells: [{ colValueId: 20, taskCount: 0, unassignedCount: 0, pinViolatedCount: 0, byModel: {} }, { colValueId: null, taskCount: 0, unassignedCount: 0, pinViolatedCount: 0, byModel: {} }] },
          ],
        },
      },
    ]);

    renderWithProviders(<OrgViewPage />);

    expect(await screen.findByRole('columnheader', { name: '東京' })).toBeInTheDocument();
    expect(screen.getByText('未割当：1')).toBeInTheDocument();
    expect(screen.getByText('aster-l：1')).toBeInTheDocument();
  });
});
