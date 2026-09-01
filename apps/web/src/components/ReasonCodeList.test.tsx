import type { Policy } from '@org-cube-model-router-demo/router-core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ReasonCodeList } from './ReasonCodeList.js';

const policies: readonly Policy[] = [
  { id: 5, name: 'フランクフルト拠点はEU限定', status: 'active', priority: 0, selector: {}, allowedRegions: ['EU'] },
];

describe('ReasonCodeList', () => {
  it('理由コードと日本語説明を表示する', () => {
    render(
      <MemoryRouter>
        <ReasonCodeList reasonCodes={['REGION_NOT_ALLOWED']} appliedPolicyIds={[5]} policies={policies} />
      </MemoryRouter>,
    );
    expect(screen.getByText('REGION_NOT_ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('モデルのリージョンが許可されていません。')).toBeInTheDocument();
  });

  it('寄与ポリシー候補をポリシー管理画面へのリンクとして表示する', () => {
    render(
      <MemoryRouter>
        <ReasonCodeList reasonCodes={['REGION_NOT_ALLOWED']} appliedPolicyIds={[5]} policies={policies} />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'フランクフルト拠点はEU限定' });
    expect(link).toHaveAttribute('href', '/policies?focus=5');
  });

  it('寄与ポリシーが無い理由コードでは「関連する適用ポリシーはありません」を表示する', () => {
    render(
      <MemoryRouter>
        <ReasonCodeList reasonCodes={['CAPABILITY_BELOW_FLOOR']} appliedPolicyIds={[5]} policies={policies} />
      </MemoryRouter>,
    );
    expect(screen.getByText('関連する適用ポリシーはありません（タスク属性・提供停止設定によるものです）。')).toBeInTheDocument();
  });
});
