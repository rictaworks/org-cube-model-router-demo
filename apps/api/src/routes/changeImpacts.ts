/**
 * F8：変更影響取得（requirements.md 2章・4.6節）。直近1回分の変更影響一覧を返す。
 */
import { Hono } from 'hono';
import { loadChangeImpacts } from '../repositories/changeImpactRepository.js';
import type { AppEnv } from '../types.js';

export const changeImpactsRouter = new Hono<AppEnv>();

changeImpactsRouter.get('/', async (c) => {
  const sessionId = c.get('sessionId');
  const changeImpacts = await loadChangeImpacts(c.env.DB, sessionId);
  return c.json({ changeImpacts });
});
