import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './ToastContext.js';

function ShowToastButton(): ReactNode {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast('success', '保存しました。')}>
      表示
    </button>
  );
}

describe('ToastProvider / useToast', () => {
  it('showToastでトーストが表示され、閉じるボタンで消える', async () => {
    render(
      <ToastProvider>
        <ShowToastButton />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(await screen.findByText('保存しました。')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(screen.queryByText('保存しました。')).not.toBeInTheDocument());
  });
});
