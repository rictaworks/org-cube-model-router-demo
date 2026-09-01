/**
 * トースト通知（CLAUDE.md：ネイティブ alert()/confirm()/prompt() の代替UIフィードバック）。
 * グローバル変数を持たず、Reactのコンテキスト・状態としてトースト一覧を保持する。
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { faCheckCircle, faCircleExclamation, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { TOAST_MESSAGES } from '../config/messages.js';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
}

interface ToastContextValue {
  readonly showToast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_ICON: Readonly<Record<ToastKind, typeof faCheckCircle>> = {
  success: faCheckCircle,
  error: faCircleExclamation,
  info: faTriangleExclamation,
};

let toastIdSeed = 0;

function nextToastId(): number {
  toastIdSeed += 1;
  return toastIdSeed;
}

export function ToastProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextToastId();
      setToasts((current) => [...current, { id, kind, message }]);
      window.setTimeout(() => dismissToast(id), 6000);
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            <FontAwesomeIcon icon={TOAST_ICON[toast.kind]} aria-hidden="true" />
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-dismiss"
              aria-label={TOAST_MESSAGES.dismiss}
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (value === null) {
    throw new Error('useToast は ToastProvider の内側でのみ使用できます。');
  }
  return value;
}
