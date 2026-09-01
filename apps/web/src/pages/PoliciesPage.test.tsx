import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { PoliciesPage } from './PoliciesPage.js';

const POLICY = {
  id: 7,
  name: 'フランクフルト拠点はEU限定',
  status: 'active',
  priority: 0,
  selector: { 1: 20 },
  allowedRegions: ['EU'],
};

const BASE_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [{ id: 1, name: '拠点', displayOrder: 1, values: [{ id: 20, dimensionId: 1, name: 'フランクフルト', displayOrder: 1 }] }] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [POLICY] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
];

describe('PoliciesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登録済みポリシーを一覧表示する', async () => {
    mockFetchRoutes(BASE_ROUTES);
    renderWithProviders(<PoliciesPage />);

    expect(await screen.findByText('フランクフルト拠点はEU限定')).toBeInTheDocument();
  });

  it('ポリシーを追加するとPOST /api/policiesを呼ぶ', async () => {
    const calls = mockFetchRoutes([
      ...BASE_ROUTES,
      { method: 'POST', match: /\/api\/policies$/, body: { policy: { ...POLICY, id: 8, name: '新しいポリシー' } }, status: 201 },
    ]);
    renderWithProviders(<PoliciesPage />);
    await screen.findByText('フランクフルト拠点はEU限定');

    await userEvent.click(screen.getByRole('button', { name: /ポリシーを追加する/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('ポリシー名'), '新しいポリシー');
    await userEvent.click(within(dialog).getByRole('button', { name: '保存する' }));

    await waitFor(() => expect(calls.some((c) => c.input.endsWith('/api/policies') && c.init?.method === 'POST')).toBe(true));
  });

  it('?focus=7 のときは該当行を強調するクラスを付与する', async () => {
    mockFetchRoutes(BASE_ROUTES);
    renderWithProviders(<PoliciesPage />, ['/policies?focus=7']);

    const row = await screen.findByText('フランクフルト拠点はEU限定').then((cell) => cell.closest('tr'));
    expect(row).toHaveClass('row-focused');
  });
});
