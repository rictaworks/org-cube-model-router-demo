/** confirm() の代替コンポーネント（CLAUDE.md 禁止API）。Modal を用いて実装する。 */
import type { ReactNode } from 'react';
import { COMMON_MESSAGES } from '../config/messages.js';
import { Modal } from './Modal.js';

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly danger?: boolean;
  readonly children: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  danger = false,
  children,
}: ConfirmDialogProps): ReactNode {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="confirm-dialog-body">{children}</div>
      <div className="confirm-dialog-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          {cancelLabel ?? COMMON_MESSAGES.cancel}
        </button>
        <button type="button" className={danger ? 'button-danger' : 'button-primary'} onClick={onConfirm}>
          {confirmLabel ?? COMMON_MESSAGES.confirm}
        </button>
      </div>
    </Modal>
  );
}
