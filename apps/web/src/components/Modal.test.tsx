import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal.js';

describe('Modal', () => {
  it('open=falseのときは何も描画しない', () => {
    render(
      <Modal open={false} title="タイトル" onClose={vi.fn()}>
        本文
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open=trueのときはタイトル・本文を描画する', () => {
    render(
      <Modal open title="次元を削除しますか？" onClose={vi.fn()}>
        本文テキスト
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: '次元を削除しますか？' })).toBeInTheDocument();
    expect(screen.getByText('本文テキスト')).toBeInTheDocument();
  });

  it('閉じるボタン押下で onClose を呼ぶ', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="タイトル" onClose={onClose}>
        本文
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escapeキー押下で onClose を呼ぶ', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="タイトル" onClose={onClose}>
        本文
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
