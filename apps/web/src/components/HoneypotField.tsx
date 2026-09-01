/**
 * requirements.md 13.4節のBot対策（ハニーポット）に対応する不可視入力欄。
 * 通常の利用者には見えない位置に配置し、値は常に空のまま送信する
 * （実際の送信値は apps/web/src/api/client.ts が付与するため、この欄自体は
 * フォーム内に不可視項目が存在すること自体を示す視覚的なマーカーとして置く）。
 */
import type { ReactNode } from 'react';
import { HONEYPOT_FIELD_NAME } from '../config/constants.js';

export function HoneypotField(): ReactNode {
  return (
    <div className="honeypot-field" aria-hidden="true">
      <label htmlFor={HONEYPOT_FIELD_NAME}>連絡先</label>
      <input id={HONEYPOT_FIELD_NAME} name={HONEYPOT_FIELD_NAME} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
