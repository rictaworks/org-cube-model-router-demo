/**
 * ホーム画面。F10：サンプル読込導線を含む（requirements.md 2章）。
 * 空のセッションであればサンプル組織の読込を案内し、各画面への導線を提供する。
 */
import { useState, type ReactNode } from 'react';
import { faBoxesStacked } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { loadSample } from '../api/sample.js';
import { ApiError } from '../api/client.js';
import { useAppData } from '../context/AppDataContext.js';
import { useToast } from '../context/ToastContext.js';
import { HOME_MESSAGES, NAV_LABELS } from '../config/messages.js';
import { ROUTES } from '../config/constants.js';

const QUICK_LINKS = [
  { to: ROUTES.dimensions, label: NAV_LABELS.dimensions },
  { to: ROUTES.policies, label: NAV_LABELS.policies },
  { to: ROUTES.tasks, label: NAV_LABELS.tasks },
  { to: ROUTES.models, label: NAV_LABELS.models },
  { to: ROUTES.assignments, label: NAV_LABELS.assignments },
  { to: ROUTES.changeImpacts, label: NAV_LABELS.changeImpacts },
  { to: ROUTES.orgView, label: NAV_LABELS.orgView },
] as const;

export function HomePage(): ReactNode {
  const { dimensions, policies, refreshAll } = useAppData();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const sessionHasData = dimensions.length > 0 || policies.length > 0;

  async function handleLoadSample(): Promise<void> {
    setSubmitting(true);
    try {
      const result = await loadSample();
      showToast('success', HOME_MESSAGES.sampleLoadSucceeded(result.dimensionCount, result.policyCount, result.taskCount));
      await refreshAll();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : String(caught);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page home-page">
      <h1>{HOME_MESSAGES.title}</h1>
      <p>{HOME_MESSAGES.description}</p>
      <p className="auto-login-notice">{HOME_MESSAGES.autoLoginNotice}</p>

      <section className="panel">
        <h2>{HOME_MESSAGES.sampleLoadTitle}</h2>
        <p>{HOME_MESSAGES.sampleLoadDescription}</p>
        {sessionHasData ? (
          <p className="hint">{HOME_MESSAGES.sampleLoadAlreadyLoadedHint}</p>
        ) : (
          <button type="button" className="button-primary" onClick={() => void handleLoadSample()} disabled={submitting}>
            <FontAwesomeIcon icon={faBoxesStacked} aria-hidden="true" />
            {HOME_MESSAGES.sampleLoadButton}
          </button>
        )}
      </section>

      <section className="panel">
        <h2>{HOME_MESSAGES.quickLinksTitle}</h2>
        <ul className="quick-links">
          {QUICK_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
