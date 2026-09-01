import { describe, expect, it } from 'vitest';
import { EXCLUSION_REASON_CODES, WARNING_REASON_CODES } from './reasonCodes.js';
import { REASON_CODE_MESSAGES } from './messages.js';

describe('messages（requirements.md 4.9節の日本語説明。文言はコードに直書きせず本ファイルに分離する）', () => {
  it('すべての除外理由コードに日本語の説明がある', () => {
    for (const code of EXCLUSION_REASON_CODES) {
      expect(REASON_CODE_MESSAGES[code]).toBeTypeOf('string');
      expect(REASON_CODE_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('すべての警告コードに日本語の説明がある', () => {
    for (const code of WARNING_REASON_CODES) {
      expect(REASON_CODE_MESSAGES[code]).toBeTypeOf('string');
      expect(REASON_CODE_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('メッセージ定義は凍結されている', () => {
    expect(Object.isFrozen(REASON_CODE_MESSAGES)).toBe(true);
  });
});
