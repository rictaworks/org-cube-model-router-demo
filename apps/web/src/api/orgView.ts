/** F9：組織ビューのAPI呼び出し（apps/api/src/routes/orgView.ts に対応）。 */
import { apiRequest } from './client.js';
import type { OrgViewResponse } from './types.js';

export interface OrgViewQuery {
  readonly rowDimensionId?: number;
  readonly colDimensionId?: number;
}

function buildQueryString(query: OrgViewQuery): string {
  const params = new URLSearchParams();
  if (query.rowDimensionId !== undefined) {
    params.set('rowDimensionId', String(query.rowDimensionId));
  }
  if (query.colDimensionId !== undefined) {
    params.set('colDimensionId', String(query.colDimensionId));
  }
  const asString = params.toString();
  return asString.length === 0 ? '' : `?${asString}`;
}

export function fetchOrgView(query: OrgViewQuery = {}): Promise<OrgViewResponse> {
  return apiRequest<OrgViewResponse>(`/org-view${buildQueryString(query)}`);
}
