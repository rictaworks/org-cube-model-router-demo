import type { Dimension } from '@org-cube-model-router-demo/router-core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectorEditor } from './SelectorEditor.js';

const dimensions: readonly Dimension[] = [
  {
    id: 10,
    name: '部門',
    displayOrder: 1,
    values: [
      { id: 100, dimensionId: 10, name: '営業', displayOrder: 1 },
      { id: 101, dimensionId: 10, name: '開発', displayOrder: 2 },
    ],
  },
];

describe('SelectorEditor', () => {
  it('次元ごとにセレクトボックスを表示し、値を選ぶとonChangeへ反映する', async () => {
    const onChange = vi.fn();
    render(<SelectorEditor dimensions={dimensions} value={{}} onChange={onChange} wildcardLabel="（任意）" />);

    const select = screen.getByLabelText('部門');
    await userEvent.selectOptions(select, '開発');

    expect(onChange).toHaveBeenCalledWith({ 10: 101 });
  });

  it('（任意）を選ぶとその次元のキーを取り除く', async () => {
    const onChange = vi.fn();
    render(<SelectorEditor dimensions={dimensions} value={{ 10: 100 }} onChange={onChange} wildcardLabel="（任意）" />);

    const select = screen.getByLabelText('部門');
    await userEvent.selectOptions(select, '（任意）');

    expect(onChange).toHaveBeenCalledWith({});
  });
});
