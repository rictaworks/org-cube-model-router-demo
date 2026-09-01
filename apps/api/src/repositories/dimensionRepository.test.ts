/**
 * dimensionRepository のセッション分離（多層防御）に関する単体テスト。
 *
 * ルートハンドラの事前所有権チェック（loadDimensions等）を経由せず、リポジトリ関数を
 * 直接呼び出すことで、SQL自体の `session_id` 絞り込みが機能していることを検証する。
 * db/schema.sql冒頭の方針「アプリケーション層は常に自セッションのsession_idで絞り込んで
 * 読み書きする」を、他セッションのIDを渡した場合に確実に弾かれることで確認する。
 */
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { ApiNotFoundError } from '../errors.js';
import { createSession } from './sessionRepository.js';
import {
  deleteDimensionCascade,
  deleteValue,
  insertDimension,
  insertValue,
  loadDimensions,
  renameDimension,
  renameValue,
} from './dimensionRepository.js';
import { insertPolicy, loadPolicies } from './policyRepository.js';

async function setUpTwoSessions(): Promise<{ ownerSessionId: string; otherSessionId: string }> {
  const ownerSessionId = crypto.randomUUID();
  const otherSessionId = crypto.randomUUID();
  const now = new Date();
  await createSession(env.DB, ownerSessionId, now);
  await createSession(env.DB, otherSessionId, now);
  return { ownerSessionId, otherSessionId };
}

describe('dimensionRepository のセッション分離', () => {
  it('renameDimension: 他セッションのIDでは改名できず、名称は変わらない', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '部門', 1);

    await expect(renameDimension(env.DB, otherSessionId, dimensionId, '乗っ取り')).rejects.toBeInstanceOf(
      ApiNotFoundError,
    );

    const dimensions = await loadDimensions(env.DB, ownerSessionId);
    expect(dimensions[0]?.name).toBe('部門');
  });

  it('renameValue: 他セッションのIDでは改名できず、名称は変わらない', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '部門', 1);
    const valueId = await insertValue(env.DB, ownerSessionId, dimensionId, '営業', 1);

    await expect(renameValue(env.DB, otherSessionId, valueId, '乗っ取り')).rejects.toBeInstanceOf(ApiNotFoundError);

    const dimensions = await loadDimensions(env.DB, ownerSessionId);
    expect(dimensions[0]?.values[0]?.name).toBe('営業');
  });

  it('deleteValue: 他セッションのIDでは削除できず、値は残る', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '部門', 1);
    const valueId = await insertValue(env.DB, ownerSessionId, dimensionId, '営業', 1);

    await expect(deleteValue(env.DB, otherSessionId, valueId)).rejects.toBeInstanceOf(ApiNotFoundError);

    const dimensions = await loadDimensions(env.DB, ownerSessionId);
    expect(dimensions[0]?.values).toHaveLength(1);
  });

  it('deleteDimensionCascade: 他セッションのIDでは削除できず、次元・値・ポリシーのセレクタが残る', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '拠点', 1);
    const valueId = await insertValue(env.DB, ownerSessionId, dimensionId, 'フランクフルト', 1);
    const policyId = await insertPolicy(env.DB, ownerSessionId, {
      name: 'EU限定',
      priority: 0,
      selector: { [dimensionId]: valueId },
      allowedRegions: ['EU'],
    });

    // 攻撃者（otherSessionId）が自セッションの次元だと偽って、被害者の次元IDを指定するケース。
    await expect(
      deleteDimensionCascade(env.DB, otherSessionId, dimensionId, [], '次元削除'),
    ).rejects.toBeInstanceOf(ApiNotFoundError);

    const dimensions = await loadDimensions(env.DB, ownerSessionId);
    expect(dimensions).toHaveLength(1);
    expect(dimensions[0]?.values).toHaveLength(1);

    const policies = await loadPolicies(env.DB, ownerSessionId);
    const policy = policies.find((p) => p.id === policyId);
    expect(policy?.selector).toEqual({ [dimensionId]: valueId });
    expect(policy?.status).toBe('active');
  });

  it('deleteDimensionCascade: disabledPolicyIdsが他セッションのポリシーの場合も例外を投げる', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '拠点', 1);
    const otherPolicyId = await insertPolicy(env.DB, otherSessionId, { name: '他セッションのポリシー', priority: 0, selector: {} });

    // 自セッション所有の次元を削除しつつ、無効化対象ポリシーIDに他セッションのIDが
    // 混入した場合（想定外の状態）も、フォールバックせず例外を投げることを確認する。
    await expect(
      deleteDimensionCascade(env.DB, ownerSessionId, dimensionId, [otherPolicyId], '次元削除'),
    ).rejects.toBeInstanceOf(ApiNotFoundError);

    const otherPolicies = await loadPolicies(env.DB, otherSessionId);
    expect(otherPolicies.find((p) => p.id === otherPolicyId)?.status).toBe('active');
  });

  it('正しいセッションIDでは改名・削除できる（回帰確認）', async () => {
    const { ownerSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '部門', 1);
    const valueId = await insertValue(env.DB, ownerSessionId, dimensionId, '営業', 1);

    await renameDimension(env.DB, ownerSessionId, dimensionId, '部署');
    await renameValue(env.DB, ownerSessionId, valueId, '営業部');

    const dimensions = await loadDimensions(env.DB, ownerSessionId);
    expect(dimensions[0]?.name).toBe('部署');
    expect(dimensions[0]?.values[0]?.name).toBe('営業部');

    await deleteDimensionCascade(env.DB, ownerSessionId, dimensionId, [], '次元削除');
    expect(await loadDimensions(env.DB, ownerSessionId)).toHaveLength(0);
  });
});
