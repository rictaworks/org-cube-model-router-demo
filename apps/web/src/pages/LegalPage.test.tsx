import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test-support/renderWithProviders.js';
import { LegalPage } from './LegalPage.js';
import { LEGAL_MESSAGES } from '../config/messages.js';

describe('LegalPage', () => {
  it('タイトルと利用規約・免責事項・連絡先の見出しを表示する', () => {
    renderWithProviders(<LegalPage />);

    expect(screen.getByRole('heading', { level: 1, name: LEGAL_MESSAGES.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: LEGAL_MESSAGES.termsHeading })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: LEGAL_MESSAGES.disclaimerHeading })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: LEGAL_MESSAGES.contactHeading })).toBeInTheDocument();
  });

  it('連絡先にinfo@rictaworks.jpのメールリンクを表示する', () => {
    renderWithProviders(<LegalPage />);

    const emailLink = screen.getByRole('link', { name: LEGAL_MESSAGES.contactEmailValue });
    expect(emailLink).toHaveAttribute('href', `mailto:${LEGAL_MESSAGES.contactEmailValue}`);
  });

  it('利用規約の各項目を表示する', () => {
    renderWithProviders(<LegalPage />);

    for (const item of LEGAL_MESSAGES.termsItems) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });
});
