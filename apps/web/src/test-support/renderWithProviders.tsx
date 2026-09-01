/** ページコンポーネントのテスト用に、Router・AppDataProvider・ToastProvider を束ねてrenderする。 */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppDataProvider } from '../context/AppDataContext.js';
import { ToastProvider } from '../context/ToastContext.js';

export function renderWithProviders(ui: ReactElement, initialEntries: readonly string[] = ['/']): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[...initialEntries]}>
      <ToastProvider>
        <AppDataProvider>{ui}</AppDataProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
