/**
 * /legal ページ。利用規約・免責事項・連絡先を1ページに集約する。
 * 内容は全デモ共通（demo-common-ui.md 参照）。デザインは本デモの既存パネル様式に合わせる。
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LEGAL_MESSAGES } from '../config/messages.js';
import { RICTAWORKS_CONTACT_LINKS, ROUTES } from '../config/constants.js';

export function LegalPage(): ReactNode {
  return (
    <div className="page legal-page">
      <p className="legal-back-link">
        <Link to={ROUTES.home}>
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> {LEGAL_MESSAGES.backToHomeLabel}
        </Link>
      </p>
      <h1>{LEGAL_MESSAGES.title}</h1>

      <section className="panel">
        <h2>{LEGAL_MESSAGES.termsHeading}</h2>
        <ul className="legal-list">
          {LEGAL_MESSAGES.termsItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>{LEGAL_MESSAGES.disclaimerHeading}</h2>
        <ul className="legal-list">
          {LEGAL_MESSAGES.disclaimerItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>{LEGAL_MESSAGES.contactHeading}</h2>
        <dl className="legal-contact">
          {LEGAL_MESSAGES.contactRows.map((row) => (
            <div className="legal-contact-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
          <div className="legal-contact-row">
            <dt>{LEGAL_MESSAGES.contactEmailLabel}</dt>
            <dd>
              <a href={`mailto:${LEGAL_MESSAGES.contactEmailValue}`}>{LEGAL_MESSAGES.contactEmailValue}</a>
            </dd>
          </div>
          <div className="legal-contact-row">
            <dt>{LEGAL_MESSAGES.contactWebLabel}</dt>
            <dd>
              <a href={RICTAWORKS_CONTACT_LINKS.web} target="_blank" rel="noopener noreferrer">
                {LEGAL_MESSAGES.contactWebValue}
              </a>
            </dd>
          </div>
          <div className="legal-contact-row">
            <dt>{LEGAL_MESSAGES.contactXLabel}</dt>
            <dd>
              <a href={RICTAWORKS_CONTACT_LINKS.x} target="_blank" rel="noopener noreferrer">
                {LEGAL_MESSAGES.contactXValue}
              </a>
            </dd>
          </div>
          <div className="legal-contact-row">
            <dt>{LEGAL_MESSAGES.contactGithubLabel}</dt>
            <dd>
              <a href={RICTAWORKS_CONTACT_LINKS.github} target="_blank" rel="noopener noreferrer">
                {LEGAL_MESSAGES.contactGithubValue}
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
