import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from './test-support/fetchMock.js';
import { App } from './App.js';

const BASE_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [] } },
];

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ホーム画面とナビゲーションを表示する', async () => {
    mockFetchRoutes(BASE_ROUTES);
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'ホーム' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'メインナビゲーション' });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /次元管理/ })).toHaveAttribute('href', '/dimensions');
  });
});
