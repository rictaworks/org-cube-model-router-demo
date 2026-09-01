/**
 * F9：組織ビュー画面（requirements.md 2章・13.2節）。任意2次元のクロス集計表。
 * 次元が1個以下の場合は1次元一覧（または全体集計）に自動的に切り替わる
 * （apps/api/src/routes/orgView.ts の mode: 'none'|'single'|'cross' にそのまま従う）。
 */
import { useCallback, useState, type ReactNode } from 'react';
import { fetchOrgView } from '../api/orgView.js';
import { AsyncBoundary } from '../components/AsyncBoundary.js';
import { useAppData } from '../context/AppDataContext.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { COMMON_MESSAGES, ORG_VIEW_MESSAGES } from '../config/messages.js';

export function OrgViewPage(): ReactNode {
  const { dimensions } = useAppData();
  const [rowDimensionId, setRowDimensionId] = useState<number | undefined>(undefined);
  const [colDimensionId, setColDimensionId] = useState<number | undefined>(undefined);

  const fetcher = useCallback(() => fetchOrgView({ rowDimensionId, colDimensionId }), [rowDimensionId, colDimensionId]);
  const resource = useApiResource(fetcher);
  const view = resource.data;

  return (
    <div className="page org-view-page">
      <h1>{ORG_VIEW_MESSAGES.title}</h1>
      <p>{ORG_VIEW_MESSAGES.description}</p>

      {dimensions.length === 0 && <p className="hint">{ORG_VIEW_MESSAGES.noDimensions}</p>}
      {dimensions.length > 0 && dimensions.length <= 1 && <p className="hint">{ORG_VIEW_MESSAGES.singleModeNotice}</p>}

      {dimensions.length > 0 && (
        <div className="org-view-controls">
          <label htmlFor="row-dimension-select">{ORG_VIEW_MESSAGES.rowDimensionLabel}</label>
          <select
            id="row-dimension-select"
            value={rowDimensionId ?? dimensions[0]?.id ?? ''}
            onChange={(event) => setRowDimensionId(Number(event.target.value))}
          >
            {dimensions.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.name}
              </option>
            ))}
          </select>

          {dimensions.length > 1 && (
            <>
              <label htmlFor="col-dimension-select">{ORG_VIEW_MESSAGES.colDimensionLabel}</label>
              <select
                id="col-dimension-select"
                value={colDimensionId ?? ''}
                onChange={(event) => setColDimensionId(event.target.value === '' ? undefined : Number(event.target.value))}
              >
                <option value="">{ORG_VIEW_MESSAGES.colDimensionNone}</option>
                {dimensions
                  .filter((dimension) => dimension.id !== (rowDimensionId ?? dimensions[0]?.id))
                  .map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.name}
                    </option>
                  ))}
              </select>
            </>
          )}
        </div>
      )}

      <AsyncBoundary loading={resource.loading} error={resource.error} onRetry={resource.reload}>
        {view !== null && view !== undefined && view.mode === 'none' && (
          <table className="data-table">
            <tbody>
              <tr>
                <th>{ORG_VIEW_MESSAGES.taskCountLabel}</th>
                <td>{view.overall.taskCount}</td>
              </tr>
              <tr>
                <th>{ORG_VIEW_MESSAGES.unassignedCountLabel}</th>
                <td>{view.overall.unassignedCount}</td>
              </tr>
              <tr>
                <th>{ORG_VIEW_MESSAGES.pinViolatedCountLabel}</th>
                <td>{view.overall.pinViolatedCount}</td>
              </tr>
            </tbody>
          </table>
        )}

        {view !== null && view !== undefined && (view.mode === 'single' || view.mode === 'cross') && (
          <div className="table-scroll">
            <table className="data-table org-view-table">
              <thead>
                <tr>
                  <th>{view.rowDimension.name}</th>
                  {view.mode === 'cross' && view.colDimension !== null
                    ? [...view.colDimension.values.map((value) => <th key={value.id}>{value.name}</th>), <th key="unset">{COMMON_MESSAGES.unset}</th>]
                    : [<th key="all">{ORG_VIEW_MESSAGES.taskCountLabel}</th>]}
                </tr>
              </thead>
              <tbody>
                {view.table.map((row) => (
                  <tr key={row.rowValueId ?? 'unset'}>
                    <th>
                      {row.rowValueId === null
                        ? COMMON_MESSAGES.unset
                        : view.rowDimension.values.find((value) => value.id === row.rowValueId)?.name ?? row.rowValueId}
                    </th>
                    {row.cells.map((cell, index) => (
                      <td key={index}>
                        <div>
                          {ORG_VIEW_MESSAGES.taskCountLabel}：{cell.taskCount}
                        </div>
                        {cell.unassignedCount > 0 && (
                          <div className="cell-highlight">
                            {ORG_VIEW_MESSAGES.unassignedCountLabel}：{cell.unassignedCount}
                          </div>
                        )}
                        {cell.pinViolatedCount > 0 && (
                          <div className="cell-highlight">
                            {ORG_VIEW_MESSAGES.pinViolatedCountLabel}：{cell.pinViolatedCount}
                          </div>
                        )}
                        {Object.keys(cell.byModel).length > 0 && (
                          <ul className="model-breakdown">
                            {Object.entries(cell.byModel).map(([modelId, count]) => (
                              <li key={modelId}>
                                {modelId}：{count}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
