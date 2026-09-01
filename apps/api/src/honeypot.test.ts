import { describe, expect, it } from 'vitest';
import { isHoneypotTriggered } from './honeypot.js';

describe('isHoneypotTriggered（requirements.md 13.4節）', () => {
  it('ハニーポット項目に値があればtrueを返す', () => {
    expect(isHoneypotTriggered({ contact_note: '何か入力された' })).toBe(true);
  });

  it('ハニーポット項目が空文字であればfalseを返す', () => {
    expect(isHoneypotTriggered({ contact_note: '' })).toBe(false);
  });

  it('ハニーポット項目が空白のみであればfalseを返す', () => {
    expect(isHoneypotTriggered({ contact_note: '   ' })).toBe(false);
  });

  it('ハニーポット項目が存在しなければfalseを返す', () => {
    expect(isHoneypotTriggered({ name: '部門' })).toBe(false);
  });

  it('ボディがオブジェクトでなければfalseを返す', () => {
    expect(isHoneypotTriggered(null)).toBe(false);
    expect(isHoneypotTriggered('text')).toBe(false);
    expect(isHoneypotTriggered([1, 2, 3])).toBe(false);
  });
});
