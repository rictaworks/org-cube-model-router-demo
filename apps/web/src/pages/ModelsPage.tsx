/**
 * F4：モデルカタログ画面（requirements.md 2章・3.4節）。カタログ閲覧・提供停止切替。
 */
import type { ReactNode } from 'react';
import { setModelUnavailable } from '../api/models.js';
import { ApiError } from '../api/client.js';
import { AsyncBoundary } from '../components/AsyncBoundary.js';
import { useAppData } from '../context/AppDataContext.js';
import { useToast } from '../context/ToastContext.js';
import { DEPLOYMENT_LABELS, LATENCY_CLASS_LABELS, MODELS_MESSAGES, REGION_LABELS } from '../config/messages.js';

export function ModelsPage(): ReactNode {
  const { models, loading, error, refreshModels } = useAppData();
  const { showToast } = useToast();

  async function handleToggle(modelId: string, nextUnavailable: boolean): Promise<void> {
    try {
      await setModelUnavailable(modelId, nextUnavailable);
      showToast('success', MODELS_MESSAGES.description);
      await refreshModels();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      showToast('error', message);
    }
  }

  return (
    <div className="page models-page">
      <h1>{MODELS_MESSAGES.title}</h1>
      <p>{MODELS_MESSAGES.description}</p>

      <AsyncBoundary loading={loading} error={error} onRetry={refreshModels}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{MODELS_MESSAGES.columnModel}</th>
              <th>{MODELS_MESSAGES.columnProvider}</th>
              <th>{MODELS_MESSAGES.columnDeployment}</th>
              <th>{MODELS_MESSAGES.columnRegion}</th>
              <th>{MODELS_MESSAGES.columnContext}</th>
              <th>{MODELS_MESSAGES.columnLatency}</th>
              <th>{MODELS_MESSAGES.columnImage}</th>
              <th>{MODELS_MESSAGES.columnPrice}</th>
              <th>{MODELS_MESSAGES.columnAvailability}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.modelId} className={model.unavailable ? 'row-unavailable' : undefined}>
                <td>{model.displayName}</td>
                <td>{model.provider}</td>
                <td>{DEPLOYMENT_LABELS[model.deployment]}</td>
                <td>{model.region === null ? '—' : REGION_LABELS[model.region]}</td>
                <td>{model.contextLimit.toLocaleString('ja-JP')}</td>
                <td>{LATENCY_CLASS_LABELS[model.latencyClass]}</td>
                <td>{model.supportsImage ? '対応' : '非対応'}</td>
                <td>{MODELS_MESSAGES.priceFormat(model.priceInPer1k, model.priceOutPer1k)}</td>
                <td>
                  <span className={model.unavailable ? 'status-badge status-highlighted' : 'status-badge'}>
                    {model.unavailable ? MODELS_MESSAGES.unavailableLabel : MODELS_MESSAGES.availableLabel}
                  </span>
                </td>
                <td>
                  <button type="button" className="button-secondary" onClick={() => void handleToggle(model.modelId, !model.unavailable)}>
                    {model.unavailable ? MODELS_MESSAGES.toggleToAvailable : MODELS_MESSAGES.toggleToUnavailable}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AsyncBoundary>
    </div>
  );
}
