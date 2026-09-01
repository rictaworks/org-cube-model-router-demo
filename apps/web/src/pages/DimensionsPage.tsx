/**
 * F1：次元管理画面（requirements.md 2章・4.1節）。次元・値の追加・改名・削除、
 * 削除時の影響確認ダイアログ（GET /api/dimensions/:id/impact）を提供する。
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import type { Dimension, DimensionValue } from '@org-cube-model-router-demo/router-core';
import { faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  createDimension,
  createDimensionValue,
  deleteDimension,
  deleteDimensionValue,
  fetchDimensionDeleteImpact,
  renameDimension,
  renameDimensionValue,
} from '../api/dimensions.js';
import { ApiError } from '../api/client.js';
import type { DimensionImpactResponse } from '../api/types.js';
import { AsyncBoundary } from '../components/AsyncBoundary.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { HoneypotField } from '../components/HoneypotField.js';
import { PrivacyNotice } from '../components/PrivacyNotice.js';
import { useAppData } from '../context/AppDataContext.js';
import { useToast } from '../context/ToastContext.js';
import { COMMON_MESSAGES, DIMENSIONS_MESSAGES } from '../config/messages.js';

interface EditingValueTarget {
  readonly dimensionId: number;
  readonly value: DimensionValue;
}

export function DimensionsPage(): ReactNode {
  const { dimensions, policies, loading, error, refreshDimensions, refreshPolicies } = useAppData();
  const { showToast } = useToast();

  const [newDimensionName, setNewDimensionName] = useState('');
  const [newValueNameByDimension, setNewValueNameByDimension] = useState<Record<number, string>>({});
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);
  const [editingDimensionName, setEditingDimensionName] = useState('');
  const [editingValue, setEditingValue] = useState<EditingValueTarget | null>(null);
  const [editingValueName, setEditingValueName] = useState('');
  const [deleteDimensionTarget, setDeleteDimensionTarget] = useState<Dimension | null>(null);
  const [deleteDimensionImpact, setDeleteDimensionImpact] = useState<DimensionImpactResponse | null>(null);
  const [deleteValueTarget, setDeleteValueTarget] = useState<{ dimensionId: number; value: DimensionValue } | null>(null);

  function reportError(caught: unknown): void {
    const message = caught instanceof ApiError ? caught.message : String(caught);
    showToast('error', message);
  }

  async function handleAddDimension(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      await createDimension(newDimensionName);
      setNewDimensionName('');
      showToast('success', COMMON_MESSAGES.saveSucceeded);
      await refreshDimensions();
    } catch (caught) {
      reportError(caught);
    }
  }

  async function handleAddValue(dimensionId: number): Promise<void> {
    const name = newValueNameByDimension[dimensionId] ?? '';
    try {
      await createDimensionValue(dimensionId, name);
      setNewValueNameByDimension((current) => ({ ...current, [dimensionId]: '' }));
      showToast('success', COMMON_MESSAGES.saveSucceeded);
      await refreshDimensions();
    } catch (caught) {
      reportError(caught);
    }
  }

  async function handleRenameDimension(): Promise<void> {
    if (editingDimension === null) {
      return;
    }
    try {
      await renameDimension(editingDimension.id, editingDimensionName);
      showToast('success', COMMON_MESSAGES.saveSucceeded);
      setEditingDimension(null);
      await refreshDimensions();
    } catch (caught) {
      reportError(caught);
    }
  }

  async function handleRenameValue(): Promise<void> {
    if (editingValue === null) {
      return;
    }
    try {
      await renameDimensionValue(editingValue.dimensionId, editingValue.value.id, editingValueName);
      showToast('success', COMMON_MESSAGES.saveSucceeded);
      setEditingValue(null);
      await refreshDimensions();
    } catch (caught) {
      reportError(caught);
    }
  }

  async function openDeleteDimensionConfirm(dimension: Dimension): Promise<void> {
    setDeleteDimensionTarget(dimension);
    setDeleteDimensionImpact(null);
    try {
      const impact = await fetchDimensionDeleteImpact(dimension.id);
      setDeleteDimensionImpact(impact);
    } catch (caught) {
      reportError(caught);
      setDeleteDimensionTarget(null);
    }
  }

  async function confirmDeleteDimension(): Promise<void> {
    if (deleteDimensionTarget === null) {
      return;
    }
    try {
      await deleteDimension(deleteDimensionTarget.id);
      showToast('success', COMMON_MESSAGES.deleteSucceeded);
      setDeleteDimensionTarget(null);
      setDeleteDimensionImpact(null);
      await Promise.all([refreshDimensions(), refreshPolicies()]);
    } catch (caught) {
      reportError(caught);
    }
  }

  async function confirmDeleteValue(): Promise<void> {
    if (deleteValueTarget === null) {
      return;
    }
    try {
      await deleteDimensionValue(deleteValueTarget.dimensionId, deleteValueTarget.value.id);
      showToast('success', COMMON_MESSAGES.deleteSucceeded);
      setDeleteValueTarget(null);
      await refreshDimensions();
    } catch (caught) {
      reportError(caught);
      setDeleteValueTarget(null);
    }
  }

  const affectedPolicyNames = (deleteDimensionImpact?.affectedPolicyIds ?? []).map(
    (policyId) => policies.find((policy) => policy.id === policyId)?.name ?? String(policyId),
  );

  return (
    <div className="page dimensions-page">
      <h1>{DIMENSIONS_MESSAGES.title}</h1>
      <p>{DIMENSIONS_MESSAGES.description}</p>

      <AsyncBoundary loading={loading} error={error} onRetry={refreshDimensions}>
        <section className="panel">
          <h2>{DIMENSIONS_MESSAGES.addDimensionTitle}</h2>
          <PrivacyNotice />
          <form onSubmit={(event) => void handleAddDimension(event)} className="inline-form">
            <label htmlFor="new-dimension-name">{DIMENSIONS_MESSAGES.dimensionNameLabel}</label>
            <input
              id="new-dimension-name"
              type="text"
              value={newDimensionName}
              placeholder={DIMENSIONS_MESSAGES.dimensionNamePlaceholder}
              onChange={(event) => setNewDimensionName(event.target.value)}
              required
            />
            <HoneypotField />
            <button type="submit" className="button-primary">
              <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
              {COMMON_MESSAGES.add}
            </button>
          </form>
        </section>

        {dimensions.length === 0 ? (
          <p className="empty-state">{DIMENSIONS_MESSAGES.noDimensions}</p>
        ) : (
          dimensions.map((dimension) => (
            <section key={dimension.id} className="panel dimension-card">
              <div className="dimension-card-header">
                {editingDimension?.id === dimension.id ? (
                  <div className="inline-edit">
                    <input
                      type="text"
                      value={editingDimensionName}
                      onChange={(event) => setEditingDimensionName(event.target.value)}
                      aria-label={DIMENSIONS_MESSAGES.renameDimensionTitle}
                    />
                    <button type="button" className="button-primary" onClick={() => void handleRenameDimension()}>
                      {COMMON_MESSAGES.save}
                    </button>
                    <button type="button" className="button-secondary" onClick={() => setEditingDimension(null)}>
                      {COMMON_MESSAGES.cancel}
                    </button>
                  </div>
                ) : (
                  <>
                    <h2>{dimension.name}</h2>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`${dimension.name}を改名する`}
                        onClick={() => {
                          setEditingDimension(dimension);
                          setEditingDimensionName(dimension.name);
                        }}
                      >
                        <FontAwesomeIcon icon={faPen} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button-danger"
                        aria-label={`${dimension.name}を削除する`}
                        onClick={() => void openDeleteDimensionConfirm(dimension)}
                      >
                        <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <h3>{DIMENSIONS_MESSAGES.valuesHeading}</h3>
              {dimension.values.length === 0 ? (
                <p className="empty-state">{DIMENSIONS_MESSAGES.noValues}</p>
              ) : (
                <ul className="value-list">
                  {dimension.values.map((value) => (
                    <li key={value.id}>
                      {editingValue?.value.id === value.id && editingValue.dimensionId === dimension.id ? (
                        <div className="inline-edit">
                          <input
                            type="text"
                            value={editingValueName}
                            onChange={(event) => setEditingValueName(event.target.value)}
                            aria-label={DIMENSIONS_MESSAGES.renameValueTitle}
                          />
                          <button type="button" className="button-primary" onClick={() => void handleRenameValue()}>
                            {COMMON_MESSAGES.save}
                          </button>
                          <button type="button" className="button-secondary" onClick={() => setEditingValue(null)}>
                            {COMMON_MESSAGES.cancel}
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{value.name}</span>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`${value.name}を改名する`}
                              onClick={() => {
                                setEditingValue({ dimensionId: dimension.id, value });
                                setEditingValueName(value.name);
                              }}
                            >
                              <FontAwesomeIcon icon={faPen} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button-danger"
                              aria-label={`${value.name}を削除する`}
                              onClick={() => setDeleteValueTarget({ dimensionId: dimension.id, value })}
                            >
                              <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAddValue(dimension.id);
                }}
              >
                <label htmlFor={`new-value-name-${dimension.id}`}>{DIMENSIONS_MESSAGES.valueNameLabel}</label>
                <input
                  id={`new-value-name-${dimension.id}`}
                  type="text"
                  value={newValueNameByDimension[dimension.id] ?? ''}
                  placeholder={DIMENSIONS_MESSAGES.valueNamePlaceholder}
                  onChange={(event) =>
                    setNewValueNameByDimension((current) => ({ ...current, [dimension.id]: event.target.value }))
                  }
                  required
                />
                <button type="submit" className="button-primary">
                  <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                  {COMMON_MESSAGES.add}
                </button>
              </form>
            </section>
          ))
        )}
      </AsyncBoundary>

      <ConfirmDialog
        open={deleteDimensionTarget !== null}
        title={DIMENSIONS_MESSAGES.deleteDimensionConfirmTitle}
        onConfirm={() => void confirmDeleteDimension()}
        onCancel={() => {
          setDeleteDimensionTarget(null);
          setDeleteDimensionImpact(null);
        }}
        danger
      >
        {deleteDimensionImpact === null ? (
          <p>{DIMENSIONS_MESSAGES.deleteDimensionImpactLoading}</p>
        ) : deleteDimensionImpact.affectedTaskCount === 0 && deleteDimensionImpact.affectedPolicyIds.length === 0 ? (
          <p>{DIMENSIONS_MESSAGES.deleteDimensionImpactNone}</p>
        ) : (
          <div>
            <p>
              {DIMENSIONS_MESSAGES.deleteDimensionImpactDescription(
                deleteDimensionImpact.affectedTaskCount,
                deleteDimensionImpact.affectedPolicyIds.length,
              )}
            </p>
            {affectedPolicyNames.length > 0 && (
              <>
                <h3>{DIMENSIONS_MESSAGES.affectedPoliciesTitle}</h3>
                <ul>
                  {affectedPolicyNames.map((name, index) => (
                    <li key={`${name}-${index}`}>{name}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteValueTarget !== null}
        title={DIMENSIONS_MESSAGES.deleteValueConfirmTitle}
        onConfirm={() => void confirmDeleteValue()}
        onCancel={() => setDeleteValueTarget(null)}
        danger
      >
        <p>{deleteValueTarget?.value.name}</p>
      </ConfirmDialog>
    </div>
  );
}
