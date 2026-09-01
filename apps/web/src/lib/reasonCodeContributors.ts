/**
 * 除外・警告理由コードに対する「寄与ポリシー（候補）」の算出（requirements.md 13.1節：
 * 「除外理由は該当するものをすべて記録し、画面では理由コードに日本語の説明と
 * 寄与ポリシー名を添えて表示する」）。
 *
 * apps/api の根拠API（GET /api/tasks/:id/assignment）は、制約項目ごとに実際に
 * 「狭めた」ポリシーID（packages/router-core の ConstraintContributors）を永続化・
 * 公開しておらず、タスクに適用されたポリシーID一覧（appliedPolicyIds）のみを返す
 * （apps/api/src は参照専用のため変更できない）。そのためここでは、適用ポリシーの
 * うち当該理由コードに関係する制約項目に値を設定しているものを「候補」として
 * 提示する（正確な一意の寄与ポリシーの特定ではない点を画面上に明記する）。
 */
import type { ExclusionReasonCode, Policy, PolicyId } from '@org-cube-model-router-demo/router-core';
import { REASON_CODE_CONSTRAINT_FIELD, type ConstraintFieldKey } from '../config/constants.js';

function policySetsField(policy: Policy, field: ConstraintFieldKey): boolean {
  switch (field) {
    case 'allowedRegions':
      return policy.allowedRegions !== undefined;
    case 'allowedProviders':
      return policy.allowedProviders !== undefined;
    case 'bannedModels':
      return policy.bannedModels !== undefined && policy.bannedModels.length > 0;
    case 'requireLocal':
      return policy.requireLocal === true;
    case 'maxCostPerRun':
      return policy.maxCostPerRun !== undefined;
    default:
      return false;
  }
}

/** 指定した理由コードに関係しうる、適用ポリシー中の候補一覧を返す（存在しなければ空配列）。 */
export function findContributingPolicies(
  reasonCode: ExclusionReasonCode,
  appliedPolicyIds: readonly PolicyId[],
  policies: readonly Policy[],
): readonly Policy[] {
  const fields = REASON_CODE_CONSTRAINT_FIELD[reasonCode];
  if (fields === undefined) {
    return [];
  }
  const appliedIdSet = new Set(appliedPolicyIds);
  return policies.filter((policy) => appliedIdSet.has(policy.id) && fields.some((field) => policySetsField(policy, field)));
}
