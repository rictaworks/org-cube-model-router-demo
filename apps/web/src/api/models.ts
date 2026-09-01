/** F4：モデルカタログのAPI呼び出し（apps/api/src/routes/models.ts に対応）。 */
import { apiRequest } from './client.js';
import type { ModelToggleResponse, ModelsResponse } from './types.js';

export function fetchModels(): Promise<ModelsResponse> {
  return apiRequest<ModelsResponse>('/models');
}

export function setModelUnavailable(modelId: string, unavailable: boolean): Promise<ModelToggleResponse> {
  return apiRequest<ModelToggleResponse>(`/models/${modelId}`, { method: 'PATCH', body: { unavailable } });
}
