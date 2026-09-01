/**
 * F5：割当結果一覧画面（requirements.md 2章・4.5節）。未割当・固定違反のタスクは
 * 強調表示し、根拠画面・タスク編集画面へ遷移できる（13.2節）。
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fetchAssignments } from '../api/assignments.js';
import { AsyncBoundary } from '../components/AsyncBoundary.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { ASSIGNMENTS_MESSAGES, COMMON_MESSAGES } from '../config/messages.js';
import { ROUTES } from '../config/constants.js';

export function AssignmentsPage(): ReactNode {
  const resource = useApiResource(fetchAssignments);
  const assignments = resource.data?.assignments ?? [];

  return (
    <div className="page assignments-page">
      <h1>{ASSIGNMENTS_MESSAGES.title}</h1>
      <p>{ASSIGNMENTS_MESSAGES.description}</p>

      <AsyncBoundary loading={resource.loading} error={resource.error} onRetry={resource.reload}>
        {assignments.length === 0 ? (
          <p className="empty-state">{ASSIGNMENTS_MESSAGES.noAssignments}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{ASSIGNMENTS_MESSAGES.columnTask}</th>
                <th>{ASSIGNMENTS_MESSAGES.columnStatus}</th>
                <th>{ASSIGNMENTS_MESSAGES.columnModel}</th>
                <th>{ASSIGNMENTS_MESSAGES.columnCost}</th>
                <th>{ASSIGNMENTS_MESSAGES.columnMonthlyCost}</th>
                <th>{COMMON_MESSAGES.actions}</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => {
                const highlighted = assignment.status === 'unassigned' || assignment.status === 'pin_violated';
                return (
                  <tr key={assignment.taskId} className={highlighted ? 'row-highlighted' : undefined}>
                    <td>{assignment.taskName}</td>
                    <td>
                      <StatusBadge status={assignment.status} />
                      {highlighted && (
                        <p className="row-highlight-note">
                          {assignment.status === 'unassigned'
                            ? ASSIGNMENTS_MESSAGES.unassignedHighlight
                            : ASSIGNMENTS_MESSAGES.pinViolatedHighlight}
                        </p>
                      )}
                    </td>
                    <td>{assignment.adoptedModelId ?? COMMON_MESSAGES.none}</td>
                    <td>{assignment.estimatedCost === null ? COMMON_MESSAGES.none : assignment.estimatedCost.toFixed(2)}</td>
                    <td>{assignment.monthlyCost === null ? COMMON_MESSAGES.none : assignment.monthlyCost.toFixed(2)}</td>
                    <td>
                      <div className="row-actions">
                        <Link to={ROUTES.assignmentDetail(assignment.taskId)}>{ASSIGNMENTS_MESSAGES.viewRationale}</Link>
                        <Link to={`${ROUTES.tasks}?focus=${assignment.taskId}`}>{ASSIGNMENTS_MESSAGES.goToTask}</Link>
                        {highlighted && <Link to={ROUTES.policies}>{ASSIGNMENTS_MESSAGES.goToPolicies}</Link>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AsyncBoundary>
    </div>
  );
}
