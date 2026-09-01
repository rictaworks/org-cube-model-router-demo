/**
 * 理由コード一覧の表示（requirements.md 4.9・13.1節）。理由コード・日本語説明・
 * 寄与ポリシー名（候補）を併記する。寄与ポリシー名はポリシー管理画面へのリンクとし、
 * 「理由コードから直接ポリシーの編集画面へ遷移できる」（13.2節）を満たす。
 */
import type { ReactNode } from 'react';
import type { Policy, PolicyId, ReasonCode } from '@org-cube-model-router-demo/router-core';
import { REASON_CODE_MESSAGES } from '@org-cube-model-router-demo/router-core';
import { Link } from 'react-router-dom';
import { ASSIGNMENT_DETAIL_MESSAGES } from '../config/messages.js';
import { ROUTES } from '../config/constants.js';
import { findContributingPolicies } from '../lib/reasonCodeContributors.js';

export interface ReasonCodeListProps {
  readonly reasonCodes: readonly ReasonCode[];
  readonly appliedPolicyIds: readonly PolicyId[];
  readonly policies: readonly Policy[];
}

function isExclusionReasonCode(code: ReasonCode): code is Parameters<typeof findContributingPolicies>[0] {
  return !code.startsWith('WARN_');
}

export function ReasonCodeList({ reasonCodes, appliedPolicyIds, policies }: ReasonCodeListProps): ReactNode {
  return (
    <ul className="reason-code-list">
      {reasonCodes.map((code) => {
        const contributors = isExclusionReasonCode(code) ? findContributingPolicies(code, appliedPolicyIds, policies) : [];
        return (
          <li key={code} className="reason-code-item">
            <div className="reason-code-heading">
              <code className="reason-code">{code}</code>
              <span className="reason-code-description">{REASON_CODE_MESSAGES[code]}</span>
            </div>
            {contributors.length > 0 ? (
              <div className="reason-code-contributors">
                <span>{ASSIGNMENT_DETAIL_MESSAGES.contributingPoliciesLabel}</span>
                <ul>
                  {contributors.map((policy) => (
                    <li key={policy.id}>
                      <Link to={`${ROUTES.policies}?focus=${policy.id}`}>{policy.name}</Link>
                    </li>
                  ))}
                </ul>
                <p className="reason-code-contributors-note">{ASSIGNMENT_DETAIL_MESSAGES.contributingPoliciesNote}</p>
              </div>
            ) : (
              <p className="reason-code-contributors-none">{ASSIGNMENT_DETAIL_MESSAGES.contributingPoliciesNone}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
