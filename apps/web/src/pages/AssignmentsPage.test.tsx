import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { AssignmentsPage } from './AssignmentsPage.js';

const BASE_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
];

describe('AssignmentsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('割当結果を一覧表示する', async () => {
    mockFetchRoutes([
      ...BASE_ROUTES,
      {
        method: 'GET',
        match: /\/api\/assignments$/,
        body: {
          assignments: [
            { taskId: 1, taskName: 'タスクA', status: 'assigned', adoptedModelId: 'aster-l', estimatedCost: 10, monthlyCost: 1000, warnings: [] },
          ],
        },
      },
    ]);
    renderWithProviders(<AssignmentsPage />);

    expect(await screen.findByText('タスクA')).toBeInTheDocument();
    expect(screen.getByText('割当済')).toBeInTheDocument();
  });

  it('未割当・固定違反のタスクを強調表示し、ポリシー確認リンクを表示する', async () => {
    mockFetchRoutes([
      ...BASE_ROUTES,
      {
        method: 'GET',
        match: /\/api\/assignments$/,
        body: {
          assignments: [
            { taskId: 2, taskName: 'タスクB', status: 'unassigned', adoptedModelId: null, estimatedCost: null, monthlyCost: null, warnings: [] },
          ],
        },
      },
    ]);
    renderWithProviders(<AssignmentsPage />);

    const row = await screen.findByText('タスクB').then((cell) => cell.closest('tr'));
    expect(row).toHaveClass('row-highlighted');
    expect(screen.getByText('未割当のため対応が必要です。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ポリシーを確認する' })).toHaveAttribute('href', '/policies');
    expect(screen.getByRole('link', { name: 'タスクを編集する' })).toHaveAttribute('href', '/tasks?focus=2');
    expect(screen.getByRole('link', { name: '根拠を見る' })).toHaveAttribute('href', '/assignments/2');
  });
});
