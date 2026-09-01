import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { TasksPage } from './TasksPage.js';

const TASK = {
  id: 3,
  name: '週次レポート要約',
  taskKind: 'summarize',
  difficulty: 'medium',
  sensitivity: 'internal',
  inputTokens: 1000,
  outputTokens: 500,
  latencyNeed: 'interactive',
  needsImage: false,
  monthlyRuns: 100,
  position: {},
  pinnedModelId: null,
};

const BASE_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
  { method: 'GET', match: /\/api\/tasks$/, body: { tasks: [TASK] } },
];

describe('TasksPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登録済みタスクを一覧表示し、割当・根拠へのリンクを持つ', async () => {
    mockFetchRoutes(BASE_ROUTES);
    renderWithProviders(<TasksPage />);

    expect(await screen.findByText('週次レポート要約')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '割当・根拠を見る' })).toHaveAttribute('href', '/assignments/3');
  });

  it('個人名・連絡先を入力しないよう注意書きを表示する', async () => {
    mockFetchRoutes(BASE_ROUTES);
    renderWithProviders(<TasksPage />);
    await screen.findByText('週次レポート要約');

    await userEvent.click(screen.getByRole('button', { name: /タスクを登録する/ }));
    expect(screen.getByRole('note')).toHaveTextContent('個人名・連絡先など個人を特定できる情報は入力しないでください。');
  });

  it('タスクを登録するとPOST /api/tasksを呼ぶ', async () => {
    const calls = mockFetchRoutes([
      ...BASE_ROUTES,
      { method: 'POST', match: /\/api\/tasks$/, body: { task: { ...TASK, id: 4, name: '新規タスク' } }, status: 201 },
    ]);
    renderWithProviders(<TasksPage />);
    await screen.findByText('週次レポート要約');

    await userEvent.click(screen.getByRole('button', { name: /タスクを登録する/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('タスク名'), '新規タスク');
    await userEvent.click(within(dialog).getByRole('button', { name: '保存する' }));

    await waitFor(() => expect(calls.some((c) => c.input.endsWith('/api/tasks') && c.init?.method === 'POST')).toBe(true));
  });

  it('タスクを削除するとDELETE /api/tasks/:idを呼ぶ', async () => {
    const calls = mockFetchRoutes([
      ...BASE_ROUTES,
      { method: 'DELETE', match: /\/api\/tasks\/3$/, body: { deleted: true } },
    ]);
    renderWithProviders(<TasksPage />);
    await screen.findByText('週次レポート要約');

    await userEvent.click(screen.getByRole('button', { name: '週次レポート要約を削除する' }));
    await userEvent.click(screen.getByRole('button', { name: '実行する' }));

    await waitFor(() => expect(calls.some((c) => c.input.endsWith('/api/tasks/3') && c.init?.method === 'DELETE')).toBe(true));
  });
});
