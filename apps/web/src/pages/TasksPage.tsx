/**
 * F3：タスク管理画面（requirements.md 2章・3.5節）。座標・属性の登録・編集・削除を行う。
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import type { Difficulty, LatencyNeed, Selector, Sensitivity, TaskKind } from '@org-cube-model-router-demo/router-core';
import { faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useSearchParams } from 'react-router-dom';
import { createTask, deleteTask, updateTask } from '../api/tasks.js';
import { ApiError } from '../api/client.js';
import type { TaskInputPayload, TaskPayload } from '../api/types.js';
import { AsyncBoundary } from '../components/AsyncBoundary.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { HoneypotField } from '../components/HoneypotField.js';
import { Modal } from '../components/Modal.js';
import { PrivacyNotice } from '../components/PrivacyNotice.js';
import { SelectorEditor } from '../components/SelectorEditor.js';
import { useAppData } from '../context/AppDataContext.js';
import { useToast } from '../context/ToastContext.js';
import { fetchTasks } from '../api/tasks.js';
import { useApiResource } from '../hooks/useApiResource.js';
import {
  COMMON_MESSAGES,
  DIFFICULTY_LABELS,
  LATENCY_NEED_LABELS,
  SENSITIVITY_LABELS,
  TASKS_MESSAGES,
  TASK_KIND_LABELS,
} from '../config/messages.js';
import { ROUTES } from '../config/constants.js';

const TASK_KINDS: readonly TaskKind[] = ['summarize', 'translate', 'classify', 'extract', 'codegen', 'dialogue', 'reasoning'];
const DIFFICULTIES: readonly Difficulty[] = ['low', 'medium', 'high'];
const SENSITIVITIES: readonly Sensitivity[] = ['public', 'internal', 'confidential', 'personal'];
const LATENCY_NEEDS: readonly LatencyNeed[] = ['interactive', 'batch'];

interface TaskFormState {
  readonly name: string;
  readonly taskKind: TaskKind;
  readonly difficulty: Difficulty;
  readonly sensitivity: Sensitivity;
  readonly inputTokens: string;
  readonly outputTokens: string;
  readonly latencyNeed: LatencyNeed;
  readonly needsImage: boolean;
  readonly monthlyRuns: string;
  readonly position: Selector;
}

const EMPTY_FORM: TaskFormState = {
  name: '',
  taskKind: 'summarize',
  difficulty: 'medium',
  sensitivity: 'internal',
  inputTokens: '1000',
  outputTokens: '500',
  latencyNeed: 'interactive',
  needsImage: false,
  monthlyRuns: '100',
  position: {},
};

function taskToForm(task: TaskPayload): TaskFormState {
  return {
    name: task.name,
    taskKind: task.taskKind as TaskKind,
    difficulty: task.difficulty as Difficulty,
    sensitivity: task.sensitivity as Sensitivity,
    inputTokens: String(task.inputTokens),
    outputTokens: String(task.outputTokens),
    latencyNeed: task.latencyNeed as LatencyNeed,
    needsImage: task.needsImage,
    monthlyRuns: String(task.monthlyRuns),
    position: task.position,
  };
}

function formToPayload(form: TaskFormState): TaskInputPayload {
  return {
    name: form.name,
    taskKind: form.taskKind,
    difficulty: form.difficulty,
    sensitivity: form.sensitivity,
    inputTokens: Number(form.inputTokens),
    outputTokens: Number(form.outputTokens),
    latencyNeed: form.latencyNeed,
    needsImage: form.needsImage,
    monthlyRuns: Number(form.monthlyRuns),
    position: form.position,
  };
}

export function TasksPage(): ReactNode {
  const { dimensions } = useAppData();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const focusedTaskId = searchParams.get('focus');

  const tasksResource = useApiResource(fetchTasks);
  const tasks = tasksResource.data?.tasks ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<TaskPayload | null>(null);

  function openAddForm(): void {
    setEditingTaskId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEditForm(task: TaskPayload): void {
    setEditingTaskId(task.id);
    setForm(taskToForm(task));
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      const payload = formToPayload(form);
      if (editingTaskId === null) {
        await createTask(payload);
      } else {
        await updateTask(editingTaskId, payload);
      }
      showToast('success', COMMON_MESSAGES.saveSucceeded);
      setFormOpen(false);
      tasksResource.reload();
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
      await deleteTask(deleteTarget.id);
      showToast('success', COMMON_MESSAGES.deleteSucceeded);
      setDeleteTarget(null);
      tasksResource.reload();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      showToast('error', message);
    }
  }

  return (
    <div className="page tasks-page">
      <h1>{TASKS_MESSAGES.title}</h1>
      <p>{TASKS_MESSAGES.description}</p>

      <button type="button" className="button-primary" onClick={openAddForm}>
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        {TASKS_MESSAGES.addTaskTitle}
      </button>

      <AsyncBoundary loading={tasksResource.loading} error={tasksResource.error} onRetry={tasksResource.reload}>
        {tasks.length === 0 ? (
          <p className="empty-state">{TASKS_MESSAGES.noTasks}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{TASKS_MESSAGES.nameLabel}</th>
                <th>{TASKS_MESSAGES.taskKindLabel}</th>
                <th>{TASKS_MESSAGES.difficultyLabel}</th>
                <th>{TASKS_MESSAGES.sensitivityLabel}</th>
                <th>{COMMON_MESSAGES.actions}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className={String(task.id) === focusedTaskId ? 'row-focused' : undefined}>
                  <td>{task.name}</td>
                  <td>{TASK_KIND_LABELS[task.taskKind as TaskKind]}</td>
                  <td>{DIFFICULTY_LABELS[task.difficulty as Difficulty]}</td>
                  <td>{SENSITIVITY_LABELS[task.sensitivity as Sensitivity]}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={ROUTES.assignmentDetail(task.id)}>{TASKS_MESSAGES.viewAssignment}</Link>
                      <button type="button" className="icon-button" aria-label={`${task.name}を編集する`} onClick={() => openEditForm(task)}>
                        <FontAwesomeIcon icon={faPen} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button-danger"
                        aria-label={`${task.name}を削除する`}
                        onClick={() => setDeleteTarget(task)}
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

      <Modal open={formOpen} title={editingTaskId === null ? TASKS_MESSAGES.addTaskTitle : TASKS_MESSAGES.editTaskTitle} onClose={() => setFormOpen(false)}>
        <form onSubmit={(event) => void handleSubmit(event)} className="task-form">
          <PrivacyNotice />

          <label htmlFor="task-name">{TASKS_MESSAGES.nameLabel}</label>
          <input
            id="task-name"
            type="text"
            value={form.name}
            placeholder={TASKS_MESSAGES.namePlaceholder}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />

          <label htmlFor="task-kind">{TASKS_MESSAGES.taskKindLabel}</label>
          <select
            id="task-kind"
            value={form.taskKind}
            onChange={(event) => setForm((current) => ({ ...current, taskKind: event.target.value as TaskKind }))}
          >
            {TASK_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {TASK_KIND_LABELS[kind]}
              </option>
            ))}
          </select>

          <label htmlFor="task-difficulty">{TASKS_MESSAGES.difficultyLabel}</label>
          <select
            id="task-difficulty"
            value={form.difficulty}
            onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))}
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {DIFFICULTY_LABELS[difficulty]}
              </option>
            ))}
          </select>

          <label htmlFor="task-sensitivity">{TASKS_MESSAGES.sensitivityLabel}</label>
          <select
            id="task-sensitivity"
            value={form.sensitivity}
            onChange={(event) => setForm((current) => ({ ...current, sensitivity: event.target.value as Sensitivity }))}
          >
            {SENSITIVITIES.map((sensitivity) => (
              <option key={sensitivity} value={sensitivity}>
                {SENSITIVITY_LABELS[sensitivity]}
              </option>
            ))}
          </select>

          <label htmlFor="task-input-tokens">{TASKS_MESSAGES.inputTokensLabel}</label>
          <input
            id="task-input-tokens"
            type="number"
            min={1}
            max={1000000}
            value={form.inputTokens}
            onChange={(event) => setForm((current) => ({ ...current, inputTokens: event.target.value }))}
            required
          />

          <label htmlFor="task-output-tokens">{TASKS_MESSAGES.outputTokensLabel}</label>
          <input
            id="task-output-tokens"
            type="number"
            min={1}
            max={100000}
            value={form.outputTokens}
            onChange={(event) => setForm((current) => ({ ...current, outputTokens: event.target.value }))}
            required
          />

          <label htmlFor="task-latency-need">{TASKS_MESSAGES.latencyNeedLabel}</label>
          <select
            id="task-latency-need"
            value={form.latencyNeed}
            onChange={(event) => setForm((current) => ({ ...current, latencyNeed: event.target.value as LatencyNeed }))}
          >
            {LATENCY_NEEDS.map((need) => (
              <option key={need} value={need}>
                {LATENCY_NEED_LABELS[need]}
              </option>
            ))}
          </select>

          <label>
            <input
              type="checkbox"
              checked={form.needsImage}
              onChange={(event) => setForm((current) => ({ ...current, needsImage: event.target.checked }))}
            />
            {TASKS_MESSAGES.needsImageLabel}
          </label>

          <label htmlFor="task-monthly-runs">{TASKS_MESSAGES.monthlyRunsLabel}</label>
          <input
            id="task-monthly-runs"
            type="number"
            min={0}
            max={1000000}
            value={form.monthlyRuns}
            onChange={(event) => setForm((current) => ({ ...current, monthlyRuns: event.target.value }))}
            required
          />

          <fieldset>
            <legend>{TASKS_MESSAGES.positionLabel}</legend>
            <p className="field-help">{TASKS_MESSAGES.positionHelp}</p>
            <SelectorEditor
              dimensions={dimensions}
              value={form.position}
              onChange={(next) => setForm((current) => ({ ...current, position: next }))}
              wildcardLabel={COMMON_MESSAGES.unset}
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
        title={TASKS_MESSAGES.deleteConfirmTitle}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        danger
      >
        <p>{deleteTarget?.name}</p>
      </ConfirmDialog>
    </div>
  );
}
