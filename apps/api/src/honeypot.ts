/**
 * ハニーポット判定（requirements.md 13.4節）。
 *
 * フロントエンドのフォームは HONEYPOT_FIELD_NAME という名前の入力欄を不可視で
 * 配置する。Bot等がその欄に値を入れて送信してきた場合、リクエストを即座に破棄する。
 * 理由は握りつぶさずログに残す（CLAUDE.md：処理の分岐点・外部境界にログを残す）。
 */
import { HONEYPOT_FIELD_NAME } from './config.js';

/** JSONボディのハニーポット項目に値が入っているかを判定する。 */
export function isHoneypotTriggered(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return false;
  }
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD_NAME];
  return typeof value === 'string' && value.trim().length > 0;
}
