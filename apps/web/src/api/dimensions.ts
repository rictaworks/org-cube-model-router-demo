/** F1：次元管理のAPI呼び出し（apps/api/src/routes/dimensions.ts に対応）。 */
import { apiRequest } from './client.js';
import type {
  DeletedResponse,
  DimensionDeleteResponse,
  DimensionImpactResponse,
  DimensionWriteResponse,
  DimensionsResponse,
  ValueWriteResponse,
} from './types.js';

export function fetchDimensions(): Promise<DimensionsResponse> {
  return apiRequest<DimensionsResponse>('/dimensions');
}

export function createDimension(name: string): Promise<DimensionWriteResponse> {
  return apiRequest<DimensionWriteResponse>('/dimensions', { method: 'POST', body: { name } });
}

export function renameDimension(dimensionId: number, name: string): Promise<DimensionWriteResponse> {
  return apiRequest<DimensionWriteResponse>(`/dimensions/${dimensionId}`, { method: 'PATCH', body: { name } });
}

export function fetchDimensionDeleteImpact(dimensionId: number): Promise<DimensionImpactResponse> {
  return apiRequest<DimensionImpactResponse>(`/dimensions/${dimensionId}/impact`);
}

export function deleteDimension(dimensionId: number): Promise<DimensionDeleteResponse> {
  return apiRequest<DimensionDeleteResponse>(`/dimensions/${dimensionId}`, { method: 'DELETE' });
}

export function createDimensionValue(dimensionId: number, name: string): Promise<ValueWriteResponse> {
  return apiRequest<ValueWriteResponse>(`/dimensions/${dimensionId}/values`, { method: 'POST', body: { name } });
}

export function renameDimensionValue(dimensionId: number, valueId: number, name: string): Promise<ValueWriteResponse> {
  return apiRequest<ValueWriteResponse>(`/dimensions/${dimensionId}/values/${valueId}`, {
    method: 'PATCH',
    body: { name },
  });
}

export function deleteDimensionValue(dimensionId: number, valueId: number): Promise<DeletedResponse> {
  return apiRequest<DeletedResponse>(`/dimensions/${dimensionId}/values/${valueId}`, { method: 'DELETE' });
}
