/**
 * 汎用モーダルダイアログ。CLAUDE.md「ネイティブの alert()/confirm()/prompt() 禁止」に
 * 従い、確認・入力UIはすべてこのコンポーネント（またはそれを用いたコンポーネント）で
 * 実装する。jsdom（テスト環境）でのネイティブ `<dialog>` の対応が不完全なため、
 * 独自実装（背景オーバーレイ＋ `role="dialog"`）でEscapeキー・背景クリックでの
 * クローズを提供する。
 */
import { useEffect, type ReactNode } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MODAL_MESSAGES } from '../config/messages.js';

export interface ModalProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

const ESCAPE_KEY = 'Escape';

export function Modal({ open, title, onClose, children }: ModalProps): ReactNode {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ESCAPE_KEY) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div
        className="app-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="app-modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" aria-label={MODAL_MESSAGES.closeButtonLabel} onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
          </button>
        </div>
        <div className="app-modal-body">{children}</div>
      </div>
    </div>
  );
}
