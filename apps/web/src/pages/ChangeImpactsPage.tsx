/**
 * F8：変更影響画面（requirements.md 2章・4.6節）。変更前→変更後の一覧を表示する。
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fetchChangeImpacts } from '../api/changeImpacts.js';
import { AsyncBoundary } from '../components/AsyncBoundary.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { ASSIGNMENT_STATUS_LABELS, CHANGE_IMPACTS_MESSAGES, CHANGE_KIND_LABELS, COMMON_MESSAGES } from '../config/messages.js';
import { ROUTES } from '../config/constants.js';

export function ChangeImpactsPage(): ReactNode {
  const resource = useApiResource(fetchChangeImpacts);
  const changeImpacts = resource.data?.changeImpacts ?? [];

  return (
    <div className="page change-impacts-page">
      <h1>{CHANGE_IMPACTS_MESSAGES.title}</h1>
      <p>{CHANGE_IMPACTS_MESSAGES.description}</p>

      <AsyncBoundary loading={resource.loading} error={resource.error} onRetry={resource.reload}>
        {changeImpacts.length === 0 ? (
          <p className="empty-state">{CHANGE_IMPACTS_MESSAGES.noChangeImpacts}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{CHANGE_IMPACTS_MESSAGES.columnChangeKind}</th>
                <th>{CHANGE_IMPACTS_MESSAGES.columnTask}</th>
                <th>{CHANGE_IMPACTS_MESSAGES.columnBefore}</th>
                <th>{CHANGE_IMPACTS_MESSAGES.columnAfter}</th>
                <th>{COMMON_MESSAGES.actions}</th>
              </tr>
            </thead>
            <tbody>
              {changeImpacts.map((impact) => (
                <tr key={impact.id}>
                  <td>{CHANGE_KIND_LABELS[impact.changeKind]}</td>
                  <td>{impact.taskName}</td>
                  <td>
                    {impact.beforeStatus === null
                      ? COMMON_MESSAGES.none
                      : `${impact.beforeModelId ?? COMMON_MESSAGES.none}（${ASSIGNMENT_STATUS_LABELS[impact.beforeStatus]}）`}
                  </td>
                  <td>
                    <StatusBadge status={impact.afterStatus} />
                    {impact.afterModelId !== null && <span> {impact.afterModelId}</span>}
                  </td>
                  <td>
                    <Link to={ROUTES.assignmentDetail(impact.taskId)}>{CHANGE_IMPACTS_MESSAGES.viewDetail}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>
    </div>
  );
}
