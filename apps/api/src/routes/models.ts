/**
 * F4：モデルカタログ閲覧・提供停止切替（requirements.md 2章・3.4節）。
 */
import { Hono } from 'hono';
import { API_MESSAGES } from '../config.js';
import { ApiNotFoundError } from '../errors.js';
import { recomputeSession } from '../recompute.js';
import { loadCatalog, loadUnavailableModelIds, modelExists, setModelUnavailable } from '../repositories/catalogRepository.js';
import type { AppEnv } from '../types.js';
import { requireBoolean, requireObject } from '../validation.js';

export const modelsRouter = new Hono<AppEnv>();

modelsRouter.get('/', async (c) => {
  const sessionId = c.get('sessionId');
  const [catalog, unavailableModelIds] = await Promise.all([
    loadCatalog(c.env.DB),
    loadUnavailableModelIds(c.env.DB, sessionId),
  ]);

  const models = catalog.map((model) => ({
    ...model,
    unavailable: unavailableModelIds.has(model.modelId),
  }));

  return c.json({ models });
});

modelsRouter.patch('/:modelId', async (c) => {
  const sessionId = c.get('sessionId');
  const modelId = c.req.param('modelId');
  const body = requireObject(c.get('parsedBody'));
  const unavailable = requireBoolean(body.unavailable, API_MESSAGES.invalidUnavailableFlag);

  const exists = await modelExists(c.env.DB, modelId);
  if (!exists) {
    throw new ApiNotFoundError(API_MESSAGES.modelNotFound);
  }

  await setModelUnavailable(c.env.DB, sessionId, modelId, unavailable);
  console.log(`[models] override session_id=${sessionId} model_id=${modelId} unavailable=${unavailable}`);

  await recomputeSession(c.env.DB, sessionId, 'model_override', new Date());

  return c.json({ modelId, unavailable });
});
