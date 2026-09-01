/**
 * 割当状態のバッジ表示。未割当・固定違反は強調表示する
 * （requirements.md 13.2節：「未割当・固定違反のタスクは一覧で強調表示」）。
 */
import type { ReactNode } from 'react';
import type { AssignmentStatus } from '@org-cube-model-router-demo/router-core';
import { faCircleCheck, faCircleExclamation, faThumbtack } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ASSIGNMENT_STATUS_LABELS } from '../config/messages.js';

export interface StatusBadgeProps {
  readonly status: AssignmentStatus;
}

const STATUS_ICON: Readonly<Record<AssignmentStatus, typeof faCircleCheck>> = {
  assigned: faCircleCheck,
  pinned: faThumbtack,
  unassigned: faCircleExclamation,
  pin_violated: faCircleExclamation,
};

const HIGHLIGHTED_STATUSES: ReadonlySet<AssignmentStatus> = new Set(['unassigned', 'pin_violated']);

export function StatusBadge({ status }: StatusBadgeProps): ReactNode {
  const highlighted = HIGHLIGHTED_STATUSES.has(status);
  return (
    <span className={`status-badge status-${status}${highlighted ? ' status-highlighted' : ''}`}>
      <FontAwesomeIcon icon={STATUS_ICON[status]} aria-hidden="true" />
      {ASSIGNMENT_STATUS_LABELS[status]}
    </span>
  );
}
