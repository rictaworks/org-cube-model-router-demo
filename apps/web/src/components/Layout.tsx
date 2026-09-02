/**
 * 共通レイアウト（アンバーバナー＋ヘッダーナビゲーション＋コンテンツ領域＋フッター＋
 * 右下固定のご相談ボタン）。全デモ共通UIの4要素のうちバナー・ナビリンク・ご相談ボタン・
 * フッターリンクをここに集約する（demo-common-ui.md 参照）。
 */
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  faChartColumn,
  faCommentDots,
  faCubes,
  faDatabase,
  faHouse,
  faListCheck,
  faScaleBalanced,
  faSitemap,
  faTableCellsLarge,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { APP_NAME, DEMO_COMMON_MESSAGES, NAV_LABELS } from '../config/messages.js';
import { DEMO_COMMON_LINKS, ROUTES } from '../config/constants.js';

const NAV_ITEMS = [
  { to: ROUTES.home, label: NAV_LABELS.home, icon: faHouse },
  { to: ROUTES.dimensions, label: NAV_LABELS.dimensions, icon: faSitemap },
  { to: ROUTES.policies, label: NAV_LABELS.policies, icon: faScaleBalanced },
  { to: ROUTES.tasks, label: NAV_LABELS.tasks, icon: faListCheck },
  { to: ROUTES.models, label: NAV_LABELS.models, icon: faDatabase },
  { to: ROUTES.assignments, label: NAV_LABELS.assignments, icon: faCubes },
  { to: ROUTES.changeImpacts, label: NAV_LABELS.changeImpacts, icon: faChartColumn },
  { to: ROUTES.orgView, label: NAV_LABELS.orgView, icon: faTableCellsLarge },
] as const;

export function Layout(): ReactNode {
  return (
    <div className="app-shell">
      <div className="demo-version-banner" role="note">
        <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
        <span>{DEMO_COMMON_MESSAGES.demoVersionBanner}</span>
      </div>
      <header className="app-header">
        <div className="app-header-title">
          <FontAwesomeIcon icon={faCubes} aria-hidden="true" />
          <span>{APP_NAME}</span>
        </div>
        <nav className="app-nav" aria-label="メインナビゲーション">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === ROUTES.home} className={({ isActive }) => (isActive ? 'app-nav-link active' : 'app-nav-link')}>
              <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <a className="app-nav-external" href={DEMO_COMMON_LINKS.demoList}>
            {DEMO_COMMON_MESSAGES.demoListLinkLabel}
          </a>
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <NavLink to={ROUTES.legal} className="app-footer-link">
          {DEMO_COMMON_MESSAGES.footerLegalLinkLabel}
        </NavLink>
        <span className="app-footer-separator">|</span>
        <span>{DEMO_COMMON_MESSAGES.footerCopyright}</span>
      </footer>
      <a
        className="consult-button"
        href={DEMO_COMMON_LINKS.consult}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon icon={faCommentDots} aria-hidden="true" />
        {DEMO_COMMON_MESSAGES.consultButtonLabel}
      </a>
    </div>
  );
}
