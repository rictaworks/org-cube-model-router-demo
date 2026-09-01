/**
 * F6：根拠表示画面（requirements.md 2章・4.3・4.4・13.1節）＋F7：固定割当（4.7節）。
 * 得点内訳・次点候補・除外理由（理由コード＋日本語説明＋寄与ポリシー名）を表示し、
 * モデルの固定・解除、固定違反の強調表示を行う。
 */
import { useCallback, useState, type ReactNode } from 'react';
import { faThumbtack, faThumbtackSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useParams } from 'react-router-dom';
import { fetchTaskAssignment, pinModel, unpinModel } from '../api/assignments.js';
import { ApiError } from '../api/client.js';
import { AsyncBoundary } from '../components/AsyncBoundary.js';
import { ReasonCodeList } from '../components/ReasonCodeList.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { useAppData } from '../context/AppDataContext.js';
import { useToast } from '../context/ToastContext.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { ASSIGNMENT_DETAIL_MESSAGES, COMMON_MESSAGES } from '../config/messages.js';
import { ROUTES } from '../config/constants.js';

export function TaskAssignmentDetailPage(): ReactNode {
  const params = useParams<{ taskId: string }>();
  const taskId = Number(params.taskId);
  const { policies, models } = useAppData();
  const { showToast } = useToast();
  const [selectedPinModelId, setSelectedPinModelId] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);

  const fetcher = useCallback(() => fetchTaskAssignment(taskId), [taskId]);
  const resource = useApiResource(fetcher);
  const assignment = resource.data?.assignment ?? null;

  async function handlePin(): Promise<void> {
    if (selectedPinModelId === '') {
      return;
    }
    setSubmittingPin(true);
    try {
      await pinModel(taskId, selectedPinModelId);
      showToast('success', ASSIGNMENT_DETAIL_MESSAGES.pinSucceeded);
      resource.reload();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      showToast('error', message);
    } finally {
      setSubmittingPin(false);
    }
  }

  async function handleUnpin(): Promise<void> {
    setSubmittingPin(true);
    try {
      await unpinModel(taskId);
      showToast('success', ASSIGNMENT_DETAIL_MESSAGES.unpinSucceeded);
      resource.reload();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      showToast('error', message);
    } finally {
      setSubmittingPin(false);
    }
  }

  const excludedCandidates = (assignment?.candidates ?? []).filter((candidate) => !candidate.passed);
  const isPinned = assignment?.status === 'pinned' || assignment?.status === 'pin_violated';

  return (
    <div className="page task-assignment-detail-page">
      <p>
        <Link to={ROUTES.assignments}>{ASSIGNMENT_DETAIL_MESSAGES.backToList}</Link>
      </p>
      <h1>{ASSIGNMENT_DETAIL_MESSAGES.title}</h1>

      <AsyncBoundary loading={resource.loading} error={resource.error} onRetry={resource.reload}>
        {assignment !== null && (
          <>
            <section className="panel">
              <h2>{ASSIGNMENT_DETAIL_MESSAGES.adoptedModelTitle}</h2>
              <p>
                <StatusBadge status={assignment.status} />
              </p>
              {assignment.adoptedModelId === null ? (
                <p>{ASSIGNMENT_DETAIL_MESSAGES.noAdoptedModel}</p>
              ) : (
                <p>{assignment.adoptedModelId}</p>
              )}

              {assignment.status === 'pin_violated' && (
                <div className="pin-violation-banner" role="alert">
                  <h3>{ASSIGNMENT_DETAIL_MESSAGES.pinViolationTitle}</h3>
                  <p>{ASSIGNMENT_DETAIL_MESSAGES.pinViolationDescription}</p>
                  <ReasonCodeList
                    reasonCodes={assignment.pinViolationReasonCodes}
                    appliedPolicyIds={assignment.appliedPolicyIds}
                    policies={policies}
                  />
                </div>
              )}
            </section>

            {assignment.adoptedModelId !== null && (
              <section className="panel">
                <h2>{ASSIGNMENT_DETAIL_MESSAGES.scoreBreakdownTitle}</h2>
                {(() => {
                  const adopted = assignment.candidates.find((candidate) => candidate.modelId === assignment.adoptedModelId);
                  if (adopted === undefined || adopted.scoreTotal === null) {
                    return null;
                  }
                  return (
                    <table className="data-table">
                      <tbody>
                        <tr>
                          <th>{ASSIGNMENT_DETAIL_MESSAGES.scoreQuality}</th>
                          <td>{adopted.scoreQuality?.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <th>{ASSIGNMENT_DETAIL_MESSAGES.scoreCost}</th>
                          <td>{adopted.scoreCost?.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <th>{ASSIGNMENT_DETAIL_MESSAGES.scoreLatency}</th>
                          <td>{adopted.scoreLatency?.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <th>{ASSIGNMENT_DETAIL_MESSAGES.scoreTotal}</th>
                          <td>{adopted.scoreTotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  );
                })()}
              </section>
            )}

            <section className="panel">
              <h2>{ASSIGNMENT_DETAIL_MESSAGES.runnersUpTitle}</h2>
              {assignment.runnersUp.length === 0 ? (
                <p>{ASSIGNMENT_DETAIL_MESSAGES.noRunnersUp}</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{ASSIGNMENT_DETAIL_MESSAGES.columnModel}</th>
                      <th>{ASSIGNMENT_DETAIL_MESSAGES.scoreTotal}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.runnersUp.map((candidate) => (
                      <tr key={candidate.modelId}>
                        <td>{candidate.modelId}</td>
                        <td>{candidate.score.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel">
              <h2>{ASSIGNMENT_DETAIL_MESSAGES.excludedModelsTitle}</h2>
              {excludedCandidates.length === 0 ? (
                <p>{ASSIGNMENT_DETAIL_MESSAGES.noExcludedModels}</p>
              ) : (
                <ul className="excluded-model-list">
                  {excludedCandidates.map((candidate) => (
                    <li key={candidate.modelId}>
                      <h3>{candidate.modelId}</h3>
                      <ReasonCodeList
                        reasonCodes={candidate.reasonCodes}
                        appliedPolicyIds={assignment.appliedPolicyIds}
                        policies={policies}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2>{ASSIGNMENT_DETAIL_MESSAGES.appliedPoliciesTitle}</h2>
              {assignment.appliedPolicyIds.length === 0 ? (
                <p>{ASSIGNMENT_DETAIL_MESSAGES.noAppliedPolicies}</p>
              ) : (
                <ul>
                  {assignment.appliedPolicyIds.map((policyId) => {
                    const policy = policies.find((candidate) => candidate.id === policyId);
                    return (
                      <li key={policyId}>
                        <Link to={`${ROUTES.policies}?focus=${policyId}`}>{policy?.name ?? String(policyId)}</Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2>{ASSIGNMENT_DETAIL_MESSAGES.warningsTitle}</h2>
              {assignment.warnings.length === 0 ? (
                <p>{ASSIGNMENT_DETAIL_MESSAGES.noWarnings}</p>
              ) : (
                <ReasonCodeList reasonCodes={assignment.warnings} appliedPolicyIds={assignment.appliedPolicyIds} policies={policies} />
              )}
            </section>

            <section className="panel">
              <h2>{ASSIGNMENT_DETAIL_MESSAGES.pinSectionTitle}</h2>
              {isPinned ? (
                <div>
                  <button type="button" className="button-secondary" onClick={() => void handleUnpin()} disabled={submittingPin}>
                    <FontAwesomeIcon icon={faThumbtackSlash} aria-hidden="true" />
                    {ASSIGNMENT_DETAIL_MESSAGES.unpinButton}
                  </button>
                </div>
              ) : (
                <div className="pin-form">
                  <label htmlFor="pin-model-select">{ASSIGNMENT_DETAIL_MESSAGES.pinSelectLabel}</label>
                  <select id="pin-model-select" value={selectedPinModelId} onChange={(event) => setSelectedPinModelId(event.target.value)}>
                    <option value="">{COMMON_MESSAGES.none}</option>
                    {models.map((model) => (
                      <option key={model.modelId} value={model.modelId}>
                        {model.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => void handlePin()}
                    disabled={submittingPin || selectedPinModelId === ''}
                  >
                    <FontAwesomeIcon icon={faThumbtack} aria-hidden="true" />
                    {ASSIGNMENT_DETAIL_MESSAGES.pinButton}
                  </button>
                </div>
              )}
            </section>

            <p className="computed-at">
              {ASSIGNMENT_DETAIL_MESSAGES.computedAtLabel}
              {assignment.computedAt}
            </p>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
