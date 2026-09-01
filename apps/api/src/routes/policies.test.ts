import { describe, expect, it } from 'vitest';
import { API_MESSAGES } from '../config.js';
import { apiRequest, issueSession } from '../test-support/testClient.js';

interface DimensionView {
  readonly id: number;
  readonly values: readonly { id: number; name: string }[];
}

async function createDimensionWithValue(sessionId: string, dimensionName: string, valueName: string) {
  const dim = await apiRequest('/api/dimensions', { method: 'POST', sessionId, body: { name: dimensionName } });
  const dimensionId = (dim.body as { dimension: { id: number } }).dimension.id;
  const value = await apiRequest(`/api/dimensions/${dimensionId}/values`, {
    method: 'POST',
    sessionId,
    body: { name: valueName },
  });
  const valueId = (value.body as { value: { id: number } }).value.id;
  return { dimensionId, valueId };
}

describe('F2 ポリシー管理（requirements.md 3.3節）', () => {
  it('全体ポリシー（セレクタ空）を作成できる', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: { name: '全体方針', weightQuality: 0.5, weightCost: 0.3, weightLatency: 0.2 },
    });
    expect(res.status).toBe(201);
    const body = res.body as { policy: { id: number; status: string; selector: Record<string, number> } };
    expect(body.policy.status).toBe('active');
    expect(body.policy.selector).toEqual({});
  });

  it('存在しない次元・値を参照するセレクタは拒否する', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: { name: '不正', selector: { 999: 999 } },
    });
    expect(res.status).toBe(400);
  });

  it('制約（許可リージョン・禁止モデル・コスト上限・ローカル必須）を指定して作成できる', async () => {
    const sessionId = await issueSession();
    const { dimensionId, valueId } = await createDimensionWithValue(sessionId, '拠点', 'フランクフルト');

    const res = await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: {
        name: 'EU限定',
        selector: { [dimensionId]: valueId },
        allowedRegions: ['EU'],
        bannedModels: ['delta-free'],
        maxCostPerRun: 50,
        requireLocal: false,
      },
    });
    expect(res.status).toBe(201);
    const body = res.body as { policy: { allowedRegions: readonly string[]; bannedModels: readonly string[] } };
    expect(body.policy.allowedRegions).toEqual(['EU']);
    expect(body.policy.bannedModels).toEqual(['delta-free']);
  });

  it('ポリシーを更新できる', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/policies', { method: 'POST', sessionId, body: { name: '全体' } });
    const policyId = (created.body as { policy: { id: number } }).policy.id;

    const res = await apiRequest(`/api/policies/${policyId}`, {
      method: 'PATCH',
      sessionId,
      body: { name: '全体方針', weightCost: 0.6 },
    });
    expect(res.status).toBe(200);
    const body = res.body as { policy: { name: string; weightCost: number } };
    expect(body.policy.name).toBe('全体方針');
    expect(body.policy.weightCost).toBe(0.6);
  });

  it('存在しないポリシーの更新は404を返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/policies/999', { method: 'PATCH', sessionId, body: { name: 'x' } });
    expect(res.status).toBe(404);
  });

  it('セレクタの形状が不正な場合、組織ビュー用ではなくセレクタ専用のエラーメッセージを返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: { name: '不正', selector: '文字列は不正' },
    });
    expect(res.status).toBe(400);
    const body = res.body as { message: string };
    expect(body.message).toBe(API_MESSAGES.invalidSelectorShape);
    expect(body.message).not.toBe(API_MESSAGES.invalidOrgViewDimension);
  });

  it('allowedProviders が配列でない場合、名称用ではなくフィールドに即したエラーメッセージを返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: { name: '不正', allowedProviders: '配列ではない' },
    });
    expect(res.status).toBe(400);
    const body = res.body as { message: string };
    expect(body.message).toBe(API_MESSAGES.invalidAllowedProviders);
    expect(body.message).not.toBe(API_MESSAGES.invalidName);
  });

  it('bannedModels が配列でない場合、名称用ではなくフィールドに即したエラーメッセージを返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: { name: '不正', bannedModels: '配列ではない' },
    });
    expect(res.status).toBe(400);
    const body = res.body as { message: string };
    expect(body.message).toBe(API_MESSAGES.invalidBannedModels);
    expect(body.message).not.toBe(API_MESSAGES.invalidName);
  });

  it('requireLocal が真偽値でない場合、名称用ではなくフィールドに即したエラーメッセージを返す', async () => {
    const sessionId = await issueSession();
    const res = await apiRequest('/api/policies', {
      method: 'POST',
      sessionId,
      body: { name: '不正', requireLocal: '真偽値ではない' },
    });
    expect(res.status).toBe(400);
    const body = res.body as { message: string };
    expect(body.message).toBe(API_MESSAGES.invalidRequireLocal);
    expect(body.message).not.toBe(API_MESSAGES.invalidName);
  });

  it('ポリシーを削除できる', async () => {
    const sessionId = await issueSession();
    const created = await apiRequest('/api/policies', { method: 'POST', sessionId, body: { name: '全体' } });
    const policyId = (created.body as { policy: { id: number } }).policy.id;

    const res = await apiRequest(`/api/policies/${policyId}`, { method: 'DELETE', sessionId });
    expect(res.status).toBe(200);

    const list = await apiRequest('/api/policies', { sessionId });
    expect((list.body as { policies: readonly unknown[] }).policies).toHaveLength(0);
  });
});
