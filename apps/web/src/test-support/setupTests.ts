/**
 * Vitest（jsdom環境）の共通セットアップ。@testing-library/jest-dom のカスタムマッチャを
 * 追加し、各テスト後にレンダリング結果を確実にアンマウントする（テストの独立性を保つ）。
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
});
