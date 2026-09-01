/** F8：変更影響のAPI呼び出し（apps/api/src/routes/changeImpacts.ts に対応）。 */
import { apiRequest } from './client.js';
import type { ChangeImpactsResponse } from './types.js';

export function fetchChangeImpacts(): Promise<ChangeImpactsResponse> {
  return apiRequest<ChangeImpactsResponse>('/change-impacts');
}
