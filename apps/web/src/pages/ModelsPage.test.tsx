import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { ModelsPage } from './ModelsPage.js';

const MODEL = {
  modelId: 'aster-l',
  displayName: 'Aster-L',
  provider: 'Aster',
  deployment: 'cloud',
  region: 'US',
  trainingOptOut: true,
  zeroRetention: true,
  contextLimit: 200000,
  latencyClass: 'standard',
  supportsImage: true,
  priceInPer1k: 2.0,
  priceOutPer1k: 8.0,
  capabilities: { summarize: 5, translate: 5, classify: 5, extract: 5, codegen: 5, dialogue: 5, reasoning: 5 },
  unavailable: false,
};

const BASE_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [MODEL] } },
];

describe('ModelsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('モデル一覧・価格・提供状況を表示する', async () => {
    mockFetchRoutes(BASE_ROUTES);
    renderWithProviders(<ModelsPage />);

    expect(await screen.findByText('Aster-L')).toBeInTheDocument();
    expect(screen.getByText('提供中')).toBeInTheDocument();
    expect(screen.getByText('入力 2 ／ 出力 8')).toBeInTheDocument();
  });

  it('提供停止にするボタンでPATCH /api/models/:modelIdを呼ぶ', async () => {
    const calls = mockFetchRoutes([
      ...BASE_ROUTES,
      { method: 'PATCH', match: /\/api\/models\/aster-l$/, body: { modelId: 'aster-l', unavailable: true } },
    ]);
    renderWithProviders(<ModelsPage />);
    await screen.findByText('Aster-L');

    await userEvent.click(screen.getByRole('button', { name: '提供停止にする' }));

    await waitFor(() =>
      expect(calls.some((c) => c.input.endsWith('/api/models/aster-l') && c.init?.method === 'PATCH')).toBe(true),
    );
    const patchCall = calls.find((c) => c.init?.method === 'PATCH');
    expect(JSON.parse(String(patchCall?.init?.body))).toMatchObject({ unavailable: true });
  });
});
