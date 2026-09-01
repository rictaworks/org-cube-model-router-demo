import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppDataProvider } from '../context/AppDataContext.js';
import { ToastProvider } from '../context/ToastContext.js';
import { mockFetchRoutes } from '../test-support/fetchMock.js';
import { TaskAssignmentDetailPage } from './TaskAssignmentDetailPage.js';

const POLICY = { id: 9, name: 'フランクフルト拠点はEU限定', status: 'active', priority: 0, selector: {}, allowedRegions: ['EU'] };

const BASE_ROUTES = [
  { method: 'GET', match: /\/api\/dimensions$/, body: { dimensions: [] } },
  { method: 'GET', match: /\/api\/policies$/, body: { policies: [POLICY] } },
  { method: 'GET', match: /\/api\/models$/, body: { models: [{ modelId: 'cedar-jp', displayName: 'Cedar-JP', provider: 'Cedar', deployment: 'cloud', region: 'JP', trainingOptOut: true, zeroRetention: true, contextLimit: 32000, latencyClass: 'fast', supportsImage: false, priceInPer1k: 0.5, priceOutPer1k: 2, capabilities: {}, unavailable: false }] } },
];

function renderDetailPage(taskId: number): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/assignments/${taskId}`]}>
      <ToastProvider>
        <AppDataProvider>
          <Routes>
            <Route path="/assignments/:taskId" element={<TaskAssignmentDetailPage />} />
          </Routes>
        </AppDataProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('TaskAssignmentDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('採用モデル・得点内訳・除外理由（理由コード＋日本語説明＋寄与ポリシー名）を表示する', async () => {
    mockFetchRoutes([
      ...BASE_ROUTES,
      {
        method: 'GET',
        match: /\/api\/tasks\/5\/assignment$/,
        body: {
          assignment: {
            taskId: 5,
            status: 'assigned',
            adoptedModelId: 'cedar-jp',
            estimatedCost: 5,
            monthlyCost: 500,
            effectiveConstraints: { allowedRegions: ['EU'], allowedProviders: null, bannedModels: [], requireLocal: false, maxCostPerRun: null, conflict: false },
            effectiveWeights: { quality: 0.5, cost: 0.3, latency: 0.2 },
            appliedPolicyIds: [9],
            warnings: [],
            pinViolationReasonCodes: [],
            runnersUp: [],
            candidates: [
              { modelId: 'cedar-jp', passed: true, reasonCodes: [], estimatedCost: 5, scoreQuality: 0.6, scoreCost: 1, scoreLatency: 1, scoreTotal: 0.68, rank: 1 },
              { modelId: 'aster-l', passed: false, reasonCodes: ['REGION_NOT_ALLOWED'], estimatedCost: 10, scoreQuality: null, scoreCost: null, scoreLatency: null, scoreTotal: null, rank: null },
            ],
            computedAt: '2026-09-02T00:00:00.000Z',
          },
        },
      },
    ]);

    renderDetailPage(5);

    expect(await screen.findByText('cedar-jp')).toBeInTheDocument();
    expect(screen.getByText('割当済')).toBeInTheDocument();
    expect(screen.getByText('REGION_NOT_ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('モデルのリージョンが許可されていません。')).toBeInTheDocument();
    const policyLinks = screen.getAllByRole('link', { name: 'フランクフルト拠点はEU限定' });
    expect(policyLinks.length).toBeGreaterThan(0);
    for (const link of policyLinks) {
      expect(link).toHaveAttribute('href', '/policies?focus=9');
    }
  });

  it('固定違反タスクは固定違反バナーと理由を強調表示する', async () => {
    mockFetchRoutes([
      ...BASE_ROUTES,
      {
        method: 'GET',
        match: /\/api\/tasks\/6\/assignment$/,
        body: {
          assignment: {
            taskId: 6,
            status: 'pin_violated',
            adoptedModelId: null,
            estimatedCost: null,
            monthlyCost: null,
            effectiveConstraints: { allowedRegions: null, allowedProviders: null, bannedModels: [], requireLocal: false, maxCostPerRun: null, conflict: false },
            effectiveWeights: { quality: 0.5, cost: 0.3, latency: 0.2 },
            appliedPolicyIds: [],
            warnings: [],
            pinViolationReasonCodes: ['MODEL_UNAVAILABLE'],
            runnersUp: [],
            candidates: [],
            computedAt: '2026-09-02T00:00:00.000Z',
          },
        },
      },
    ]);

    renderDetailPage(6);

    expect(await screen.findByRole('heading', { name: '固定違反', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('MODEL_UNAVAILABLE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /固定を解除する/ })).toBeInTheDocument();
  });

  it('モデルを選んで固定するとPOST /api/tasks/:id/pinを呼ぶ', async () => {
    const calls = mockFetchRoutes([
      ...BASE_ROUTES,
      {
        method: 'GET',
        match: /\/api\/tasks\/7\/assignment$/,
        body: {
          assignment: {
            taskId: 7,
            status: 'assigned',
            adoptedModelId: 'cedar-jp',
            estimatedCost: 5,
            monthlyCost: 500,
            effectiveConstraints: { allowedRegions: null, allowedProviders: null, bannedModels: [], requireLocal: false, maxCostPerRun: null, conflict: false },
            effectiveWeights: { quality: 0.5, cost: 0.3, latency: 0.2 },
            appliedPolicyIds: [],
            warnings: [],
            pinViolationReasonCodes: [],
            runnersUp: [],
            candidates: [{ modelId: 'cedar-jp', passed: true, reasonCodes: [], estimatedCost: 5, scoreQuality: 0.6, scoreCost: 1, scoreLatency: 1, scoreTotal: 0.68, rank: 1 }],
            computedAt: '2026-09-02T00:00:00.000Z',
          },
        },
      },
      {
        method: 'POST',
        match: /\/api\/tasks\/7\/pin$/,
        body: {
          assignment: {
            taskId: 7,
            status: 'pinned',
            adoptedModelId: 'cedar-jp',
            estimatedCost: 5,
            monthlyCost: 500,
            effectiveConstraints: { allowedRegions: null, allowedProviders: null, bannedModels: [], requireLocal: false, maxCostPerRun: null, conflict: false },
            effectiveWeights: { quality: 0.5, cost: 0.3, latency: 0.2 },
            appliedPolicyIds: [],
            warnings: [],
            pinViolationReasonCodes: [],
            runnersUp: [],
            candidates: [{ modelId: 'cedar-jp', passed: true, reasonCodes: [], estimatedCost: 5, scoreQuality: 0.6, scoreCost: 1, scoreLatency: 1, scoreTotal: 0.68, rank: 1 }],
            computedAt: '2026-09-02T00:01:00.000Z',
          },
        },
      },
    ]);

    renderDetailPage(7);
    await screen.findByText('割当済');

    await userEvent.selectOptions(screen.getByLabelText('固定するモデルを選ぶ'), 'Cedar-JP');
    await userEvent.click(screen.getByRole('button', { name: /固定する/ }));

    await waitFor(() => expect(calls.some((c) => c.input.endsWith('/api/tasks/7/pin') && c.init?.method === 'POST')).toBe(true));
    const pinCall = calls.find((c) => c.init?.method === 'POST');
    expect(JSON.parse(String(pinCall?.init?.body))).toMatchObject({ modelId: 'cedar-jp' });
  });
});
