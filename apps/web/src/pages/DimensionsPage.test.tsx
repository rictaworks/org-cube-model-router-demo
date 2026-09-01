import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { DimensionsPage } from './DimensionsPage.js';

const DIMENSION = {
  id: 1,
  name: '部門',
  displayOrder: 1,
  values: [{ id: 10, dimensionId: 1, name: '営業', displayOrder: 1 }],
};

const BASE_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [DIMENSION] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
];

describe('DimensionsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登録済みの次元・値を一覧表示する', async () => {
    mockFetchRoutes(BASE_ROUTES);
    renderWithProviders(<DimensionsPage />);

    expect(await screen.findByRole('heading', { name: '部門' })).toBeInTheDocument();
    expect(screen.getByText('営業')).toBeInTheDocument();
  });

  it('次元を追加するとPOST /api/dimensionsを呼ぶ', async () => {
    const calls = mockFetchRoutes([
      ...BASE_ROUTES,
      { method: 'POST', match: /\/api\/dimensions$/, body: { dimension: { id: 2, name: '拠点', displayOrder: 2, values: [] } } },
    ]);
    renderWithProviders(<DimensionsPage />);
    await screen.findByRole('heading', { name: '部門' });

    await userEvent.type(screen.getByLabelText('次元名'), '拠点');
    await userEvent.click(screen.getAllByRole('button', { name: /追加する/ })[0] as HTMLElement);

    await waitFor(() => expect(calls.some((c) => c.input.includes('/api/dimensions') && c.init?.method === 'POST')).toBe(true));
  });

  it('次元削除ボタンで影響プレビューを取得し、確認ダイアログに件数を表示する', async () => {
    mockFetchRoutes([
      ...BASE_ROUTES,
      { method: 'GET', match: /\/api\/dimensions\/1\/impact$/, body: { affectedTaskCount: 3, affectedPolicyIds: [] } },
    ]);
    renderWithProviders(<DimensionsPage />);
    await screen.findByRole('heading', { name: '部門' });

    await userEvent.click(screen.getByRole('button', { name: '部門を削除する' }));

    expect(
      await screen.findByText('この次元を削除すると、3件のタスクの座標が失われ、0件のポリシーが無効化されます（削除はされません）。'),
    ).toBeInTheDocument();
  });

  it('値の削除が参照ありで拒否された場合はエラートーストを表示する', async () => {
    mockFetchRoutes([
      ...BASE_ROUTES,
      {
        method: 'DELETE',
        match: /\/api\/dimensions\/1\/values\/10$/,
        body: { message: 'この値を参照しているタスクが2件、ポリシーが0件あるため削除できません。' },
        status: 409,
      },
    ]);
    renderWithProviders(<DimensionsPage />);
    await screen.findByRole('heading', { name: '部門' });

    await userEvent.click(screen.getByRole('button', { name: '営業を削除する' }));
    await userEvent.click(screen.getByRole('button', { name: '実行する' }));

    expect(await screen.findByText('この値を参照しているタスクが2件、ポリシーが0件あるため削除できません。')).toBeInTheDocument();
  });
});
