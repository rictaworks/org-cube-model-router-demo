/** F10：サンプル読込のAPI呼び出し（apps/api/src/routes/sample.ts に対応）。 */
import { apiRequest } from './client.js';
import type { SampleLoadResponse } from './types.js';

export function loadSample(): Promise<SampleLoadResponse> {
  return apiRequest<SampleLoadResponse>('/sample/load', { method: 'POST', body: {} });
}
