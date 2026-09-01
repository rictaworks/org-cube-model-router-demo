import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog.js';

describe('ConfirmDialog', () => {
  it('実行・キャンセル押下でそれぞれのコールバックを呼ぶ', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="削除しますか？" onConfirm={onConfirm} onCancel={onCancel}>
        この操作は取り消せません。
      </ConfirmDialog>,
    );

    expect(screen.getByText('この操作は取り消せません。')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: '実行する' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
