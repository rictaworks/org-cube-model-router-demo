/**
 * requirements.md 1.4・13.2節：タスク名・次元の値の入力欄に個人名や連絡先を
 * 入力しないよう注意喚起する再利用コンポーネント。
 */
import type { ReactNode } from 'react';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { COMMON_MESSAGES } from '../config/messages.js';

export function PrivacyNotice(): ReactNode {
  return (
    <p className="privacy-notice" role="note">
      <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
      <span>{COMMON_MESSAGES.privacyNotice}</span>
    </p>
  );
}
