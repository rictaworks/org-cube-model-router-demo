/**
 * policyRepository のセッション分離（多層防御）に関する単体テスト。
 *
 * ルートハンドラの事前所有権チェック（findPolicyId等）を経由せず、リポジトリ関数を
 * 直接呼び出すことで、SQL自体の `session_id` 絞り込みが機能していることを検証する。
 */
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { ApiNotFoundError } from '../errors.js';
import { insertDimension, insertValue } from './dimensionRepository.js';
import { createSession } from './sessionRepository.js';
import { deletePolicy, insertPolicy, loadPolicies, updatePolicy, type PolicyWriteInput } from './policyRepository.js';

const BASE_POLICY_INPUT: PolicyWriteInput = {
  name: '全体方針',
  priority: 0,
  selector: {},
};

async function setUpTwoSessions(): Promise<{ ownerSessionId: string; otherSessionId: string }> {
  const ownerSessionId = crypto.randomUUID();
  const otherSessionId = crypto.randomUUID();
  const now = new Date();
  await createSession(env.DB, ownerSessionId, now);
  await createSession(env.DB, otherSessionId, now);
  return { ownerSessionId, otherSessionId };
}

describe('policyRepository のセッション分離', () => {
  it('updatePolicy: 他セッションのIDでは更新できず、内容は変わらない', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const policyId = await insertPolicy(env.DB, ownerSessionId, BASE_POLICY_INPUT);

    await expect(
      updatePolicy(env.DB, otherSessionId, policyId, { ...BASE_POLICY_INPUT, name: '乗っ取り' }),
    ).rejects.toBeInstanceOf(ApiNotFoundError);

    const policies = await loadPolicies(env.DB, ownerSessionId);
    expect(policies[0]?.name).toBe('全体方針');
  });

  it('updatePolicy: セレクタを持つポリシーを他セッションから更新しようとしてもセレクタは変わらない', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '拠点', 1);
    const valueId = await insertValue(env.DB, ownerSessionId, dimensionId, 'フランクフルト', 1);
    const policyId = await insertPolicy(env.DB, ownerSessionId, {
      ...BASE_POLICY_INPUT,
      selector: { [dimensionId]: valueId },
    });

    await expect(
      updatePolicy(env.DB, otherSessionId, policyId, { ...BASE_POLICY_INPUT, selector: {} }),
    ).rejects.toBeInstanceOf(ApiNotFoundError);

    const policies = await loadPolicies(env.DB, ownerSessionId);
    expect(policies[0]?.selector).toEqual({ [dimensionId]: valueId });
  });

  it('deletePolicy: 他セッションのIDでは削除できず、ポリシー・セレクタが残る', async () => {
    const { ownerSessionId, otherSessionId } = await setUpTwoSessions();
    const dimensionId = await insertDimension(env.DB, ownerSessionId, '拠点', 1);
    const valueId = await insertValue(env.DB, ownerSessionId, dimensionId, 'フランクフルト', 1);
    const policyId = await insertPolicy(env.DB, ownerSessionId, {
      ...BASE_POLICY_INPUT,
      selector: { [dimensionId]: valueId },
    });

    // 攻撃者（otherSessionId）が自セッションのポリシーだと偽って、被害者のポリシーIDを指定するケース。
    await expect(deletePolicy(env.DB, otherSessionId, policyId)).rejects.toBeInstanceOf(ApiNotFoundError);

    const policies = await loadPolicies(env.DB, ownerSessionId);
    expect(policies).toHaveLength(1);
    expect(policies[0]?.selector).toEqual({ [dimensionId]: valueId });
  });

  it('正しいセッションIDでは更新・削除できる（回帰確認）', async () => {
    const { ownerSessionId } = await setUpTwoSessions();
    const policyId = await insertPolicy(env.DB, ownerSessionId, BASE_POLICY_INPUT);

    await updatePolicy(env.DB, ownerSessionId, policyId, { ...BASE_POLICY_INPUT, name: '更新後' });
    expect((await loadPolicies(env.DB, ownerSessionId))[0]?.name).toBe('更新後');

    await deletePolicy(env.DB, ownerSessionId, policyId);
    expect(await loadPolicies(env.DB, ownerSessionId)).toHaveLength(0);
  });
});
