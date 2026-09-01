/** F5：割当結果一覧、F6：根拠表示、F7：固定割当のAPI呼び出し。 */
import { apiRequest } from './client.js';
import type { AssignmentDetailResponse, AssignmentsResponse } from './types.js';

export function fetchAssignments(): Promise<AssignmentsResponse> {
  return apiRequest<AssignmentsResponse>('/assignments');
}

export function fetchTaskAssignment(taskId: number): Promise<AssignmentDetailResponse> {
  return apiRequest<AssignmentDetailResponse>(`/tasks/${taskId}/assignment`);
}

/** F7：固定割当（apps/api/src/routes/pin.ts）。409拒否時は ApiError（reasonCodes付き）を投げる。 */
export function pinModel(taskId: number, modelId: string): Promise<AssignmentDetailResponse> {
  return apiRequest<AssignmentDetailResponse>(`/tasks/${taskId}/pin`, { method: 'POST', body: { modelId } });
}

export function unpinModel(taskId: number): Promise<AssignmentDetailResponse> {
  return apiRequest<AssignmentDetailResponse>(`/tasks/${taskId}/pin`, { method: 'DELETE' });
}
