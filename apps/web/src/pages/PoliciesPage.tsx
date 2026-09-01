/**
 * F2：ポリシー管理画面（requirements.md 2章・3.3節）。セレクタ・制約・重みを編集する。
 */
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { Policy, Region, Selector } from '@org-cube-model-router-demo/router-core';
import { faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSearchParams } from 'react-router-dom';
import { createPolicy, deletePolicy, updatePolicy } from '../api/policies.js';
import { ApiError } from '../api/client.js';
import type { PolicyInputPayload } from '../api/types.js';
import { AsyncBoundary } from '../components/AsyncBoundary.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { HoneypotField } from '../components/HoneypotField.js';
import { Modal } from '../components/Modal.js';
import { SelectorEditor } from '../components/SelectorEditor.js';
import { useAppData } from '../context/AppDataContext.js';
import { useToast } from '../context/ToastContext.js';
import { COMMON_MESSAGES, POLICIES_MESSAGES, REGION_LABELS } from '../config/messages.js';

const ALL_REGIONS: readonly Region[] = ['JP', 'US', 'EU'];

interface PolicyFormState {
  readonly name: string;
  readonly priority: string;
  readonly selector: Selector;
  readonly allowedRegions: readonly Region[];
  readonly allowedProviders: string;
  readonly bannedModels: string;
  readonly requireLocal: boolean;
  readonly maxCostPerRun: string;
  readonly weightQuality: string;
  readonly weightCost: string;
  readonly weightLatency: string;
}

const EMPTY_FORM: PolicyFormState = {
  name: '',
  priority: '0',
  selector: {},
  allowedRegions: [],
  allowedProviders: '',
  bannedModels: '',
  requireLocal: false,
  maxCostPerRun: '',
  weightQuality: '',
  weightCost: '',
  weightLatency: '',
};

function policyToForm(policy: Policy): PolicyFormState {
  return {
    name: policy.name,
    priority: String(policy.priority),
    selector: policy.selector,
    allowedRegions: policy.allowedRegions ?? [],
    allowedProviders: (policy.allowedProviders ?? []).join(','),
    bannedModels: (policy.bannedModels ?? []).join(','),
    requireLocal: policy.requireLocal ?? false,
    maxCostPerRun: policy.maxCostPerRun === undefined ? '' : String(policy.maxCostPerRun),
    weightQuality: policy.weightQuality === undefined ? '' : String(policy.weightQuality),
    weightCost: policy.weightCost === undefined ? '' : String(policy.weightCost),
    weightLatency: policy.weightLatency === undefined ? '' : String(policy.weightLatency),
  };
}

function splitCsv(value: string): readonly string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function formToPayload(form: PolicyFormState): PolicyInputPayload {
  return {
    name: form.name,
    priority: Number(form.priority),
    selector: form.selector,
    allowedRegions: form.allowedRegions.length > 0 ? form.allowedRegions : undefined,
    allowedProviders: form.allowedProviders.trim().length > 0 ? splitCsv(form.allowedProviders) : undefined,
    bannedModels: form.bannedModels.trim().length > 0 ? splitCsv(form.bannedModels) : undefined,
    requireLocal: form.requireLocal ? true : undefined,
    maxCostPerRun: form.maxCostPerRun.trim().length > 0 ? Number(form.maxCostPerRun) : undefined,
    weightQuality: form.weightQuality.trim().length > 0 ? Number(form.weightQuality) : undefined,
    weightCost: form.weightCost.trim().length > 0 ? Number(form.weightCost) : undefined,
    weightLatency: form.weightLatency.trim().length > 0 ? Number(form.weightLatency) : undefined,
  };
}

function specificityOf(policy: Policy): number {
  return Object.keys(policy.selector).length;
}

export function PoliciesPage(): ReactNode {
  const { dimensions, policies, loading, error, refreshPolicies } = useAppData();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const focusedPolicyId = searchParams.get('focus');

  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<number | null>(null);
  const [form, setForm] = useState<PolicyFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);

  const sortedPolicies = useMemo(
    () => [...policies].sort((a, b) => specificityOf(a) - specificityOf(b) || a.priority - b.priority || a.id - b.id),
    [policies],
  );

  function openAddForm(): void {
    setEditingPolicyId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEditForm(policy: Policy): void {
    setEditingPolicyId(policy.id);
    setForm(policyToForm(policy));
    setFormOpen(true);
  }

  function toggleRegion(region: Region): void {
    setForm((current) => ({
      ...current,
      allowedRegions: current.allowedRegions.includes(region)
        ? current.allowedRegions.filter((r) => r !== region)
        : [...current.allowedRegions, region],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      const payload = formToPayload(form);
      if (editingPolicyId === null) {
        await createPolicy(payload);
      } else {
        await updatePolicy(editingPolicyId, payload);
      }
      showToast('success', COMMON_MESSAGES.saveSucceeded);
      setFormOpen(false);
      await refreshPolicies();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      showToast('error', message);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (deleteTarget === null) {
      return;
    }
    try {
      await deletePolicy(deleteTarget.id);
      showToast('success', COMMON_MESSAGES.deleteSucceeded);
      setDeleteTarget(null);
      await refreshPolicies();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      showToast('error', message);
    }
  }

  return (
    <div className="page policies-page">
      <h1>{POLICIES_MESSAGES.title}</h1>
      <p>{POLICIES_MESSAGES.description}</p>

      <button type="button" className="button-primary" onClick={openAddForm}>
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        {POLICIES_MESSAGES.addPolicyTitle}
      </button>

      <AsyncBoundary loading={loading} error={error} onRetry={refreshPolicies}>
        {sortedPolicies.length === 0 ? (
          <p className="empty-state">{POLICIES_MESSAGES.noPolicies}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{POLICIES_MESSAGES.nameLabel}</th>
                <th>{POLICIES_MESSAGES.specificityLabel}</th>
                <th>{POLICIES_MESSAGES.priorityLabel}</th>
                <th>{POLICIES_MESSAGES.statusLabel}</th>
                <th>{COMMON_MESSAGES.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPolicies.map((policy) => (
                <tr key={policy.id} className={String(policy.id) === focusedPolicyId ? 'row-focused' : undefined}>
                  <td>{policy.name}</td>
                  <td>{specificityOf(policy)}</td>
                  <td>{policy.priority}</td>
                  <td>{policy.status === 'active' ? POLICIES_MESSAGES.statusActive : POLICIES_MESSAGES.statusDisabled}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="icon-button" aria-label={`${policy.name}を編集する`} onClick={() => openEditForm(policy)}>
                        <FontAwesomeIcon icon={faPen} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button-danger"
                        aria-label={`${policy.name}を削除する`}
                        onClick={() => setDeleteTarget(policy)}
                      >
                        <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>

      <Modal open={formOpen} title={editingPolicyId === null ? POLICIES_MESSAGES.addPolicyTitle : POLICIES_MESSAGES.editPolicyTitle} onClose={() => setFormOpen(false)}>
        <form onSubmit={(event) => void handleSubmit(event)} className="policy-form">
          <HoneypotField />
          <label htmlFor="policy-name">{POLICIES_MESSAGES.nameLabel}</label>
          <input
            id="policy-name"
            type="text"
            value={form.name}
            placeholder={POLICIES_MESSAGES.namePlaceholder}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />

          <label htmlFor="policy-priority">{POLICIES_MESSAGES.priorityLabel}</label>
          <input
            id="policy-priority"
            type="number"
            value={form.priority}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
          />
          <p className="field-help">{POLICIES_MESSAGES.priorityHelp}</p>

          <fieldset>
            <legend>{POLICIES_MESSAGES.selectorLabel}</legend>
            <p className="field-help">{POLICIES_MESSAGES.selectorHelp}</p>
            <SelectorEditor
              dimensions={dimensions}
              value={form.selector}
              onChange={(next) => setForm((current) => ({ ...current, selector: next }))}
              wildcardLabel={POLICIES_MESSAGES.wildcardOption}
            />
          </fieldset>

          <fieldset>
            <legend>{POLICIES_MESSAGES.constraintsLegend}</legend>

            <span>{POLICIES_MESSAGES.allowedRegionsLabel}</span>
            <div className="checkbox-group">
              {ALL_REGIONS.map((region) => (
                <label key={region}>
                  <input type="checkbox" checked={form.allowedRegions.includes(region)} onChange={() => toggleRegion(region)} />
                  {REGION_LABELS[region]}
                </label>
              ))}
            </div>

            <label htmlFor="policy-allowed-providers">{POLICIES_MESSAGES.allowedProvidersLabel}</label>
            <input
              id="policy-allowed-providers"
              type="text"
              value={form.allowedProviders}
              placeholder={POLICIES_MESSAGES.allowedProvidersPlaceholder}
              onChange={(event) => setForm((current) => ({ ...current, allowedProviders: event.target.value }))}
            />

            <label htmlFor="policy-banned-models">{POLICIES_MESSAGES.bannedModelsLabel}</label>
            <input
              id="policy-banned-models"
              type="text"
              value={form.bannedModels}
              onChange={(event) => setForm((current) => ({ ...current, bannedModels: event.target.value }))}
            />

            <label>
              <input
                type="checkbox"
                checked={form.requireLocal}
                onChange={(event) => setForm((current) => ({ ...current, requireLocal: event.target.checked }))}
              />
              {POLICIES_MESSAGES.requireLocalLabel}
            </label>

            <label htmlFor="policy-max-cost">{POLICIES_MESSAGES.maxCostPerRunLabel}</label>
            <input
              id="policy-max-cost"
              type="number"
              min={0}
              value={form.maxCostPerRun}
              onChange={(event) => setForm((current) => ({ ...current, maxCostPerRun: event.target.value }))}
            />
          </fieldset>

          <fieldset>
            <legend>{POLICIES_MESSAGES.weightsLegend}</legend>
            <p className="field-help">{POLICIES_MESSAGES.weightsHelp}</p>

            <label htmlFor="policy-weight-quality">{POLICIES_MESSAGES.weightQualityLabel}</label>
            <input
              id="policy-weight-quality"
              type="number"
              min={0}
              step="any"
              value={form.weightQuality}
              onChange={(event) => setForm((current) => ({ ...current, weightQuality: event.target.value }))}
            />

            <label htmlFor="policy-weight-cost">{POLICIES_MESSAGES.weightCostLabel}</label>
            <input
              id="policy-weight-cost"
              type="number"
              min={0}
              step="any"
              value={form.weightCost}
              onChange={(event) => setForm((current) => ({ ...current, weightCost: event.target.value }))}
            />

            <label htmlFor="policy-weight-latency">{POLICIES_MESSAGES.weightLatencyLabel}</label>
            <input
              id="policy-weight-latency"
              type="number"
              min={0}
              step="any"
              value={form.weightLatency}
              onChange={(event) => setForm((current) => ({ ...current, weightLatency: event.target.value }))}
            />
          </fieldset>

          <div className="form-actions">
            <button type="button" className="button-secondary" onClick={() => setFormOpen(false)}>
              {COMMON_MESSAGES.cancel}
            </button>
            <button type="submit" className="button-primary">
              {COMMON_MESSAGES.save}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={POLICIES_MESSAGES.deleteConfirmTitle}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        danger
      >
        <p>{deleteTarget?.name}</p>
      </ConfirmDialog>
    </div>
  );
}
