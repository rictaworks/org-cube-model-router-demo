/**
 * Layout の全デモ共通UI（アンバーバナー・デモ一覧リンク・ご相談ボタン・
 * legalページへのフッターリンク）を検証する。
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout.js';
import { DEMO_COMMON_LINKS } from '../config/constants.js';
import { DEMO_COMMON_MESSAGES } from '../config/messages.js';

function renderLayout(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>本文</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  it('アンバーバナーをheaderの外・上に表示する', () => {
    renderLayout();

    const banner = screen.getByText(DEMO_COMMON_MESSAGES.demoVersionBanner);
    expect(banner).toBeInTheDocument();
    const header = screen.getByRole('banner');
    // header要素とアンバーバナーは別要素であり、header内包でないこと（header外に配置）
    expect(header.contains(banner)).toBe(false);
  });

  it('ナビ右端に「← デモ一覧へ」リンクを表示し、rictaworks.jp/#demosへリンクする', () => {
    renderLayout();

    const link = screen.getByRole('link', { name: DEMO_COMMON_MESSAGES.demoListLinkLabel });
    expect(link).toHaveAttribute('href', DEMO_COMMON_LINKS.demoList);
  });

  it('右下固定の「ご相談はこちら」ボタンを表示し、rictaworks.jp/へリンクする', () => {
    renderLayout();

    const link = screen.getByRole('link', { name: DEMO_COMMON_MESSAGES.consultButtonLabel });
    expect(link).toHaveAttribute('href', DEMO_COMMON_LINKS.consult);
  });

  it('フッターに「利用規約・免責事項・連絡先」リンクを表示し、/legalへリンクする', () => {
    renderLayout();

    const link = screen.getByRole('link', { name: DEMO_COMMON_MESSAGES.footerLegalLinkLabel });
    expect(link).toHaveAttribute('href', '/legal');
  });

  it('子ルートの本文を表示する', () => {
    renderLayout();

    expect(screen.getByText('本文')).toBeInTheDocument();
  });
});
