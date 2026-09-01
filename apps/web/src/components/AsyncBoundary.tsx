/** 各画面共通の「読み込み中／エラー／本体」の出し分け（DRY）。 */
import type { ReactNode } from 'react';
import { faRotateRight, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { COMMON_MESSAGES } from '../config/messages.js';

export interface AsyncBoundaryProps {
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry?: () => void;
  readonly children: ReactNode;
}

export function AsyncBoundary({ loading, error, onRetry, children }: AsyncBoundaryProps): ReactNode {
  if (loading) {
    return (
      <div className="async-state async-loading" role="status">
        {COMMON_MESSAGES.loading}
      </div>
    );
  }
  if (error !== null) {
    return (
      <div className="async-state async-error" role="alert">
        <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
        <span>{error}</span>
        {onRetry !== undefined && (
          <button type="button" className="button-secondary" onClick={onRetry}>
            <FontAwesomeIcon icon={faRotateRight} aria-hidden="true" />
            {COMMON_MESSAGES.retry}
          </button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
