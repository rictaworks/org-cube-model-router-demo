/** F2：ポリシー管理のAPI呼び出し（apps/api/src/routes/policies.ts に対応）。 */
import { apiRequest } from './client.js';
import type { DeletedResponse, PoliciesResponse, PolicyInputPayload, PolicyWriteResponse } from './types.js';

export function fetchPolicies(): Promise<PoliciesResponse> {
  return apiRequest<PoliciesResponse>('/policies');
}

export function createPolicy(input: PolicyInputPayload): Promise<PolicyWriteResponse> {
  return apiRequest<PolicyWriteResponse>('/policies', { method: 'POST', body: input as unknown as Record<string, unknown> });
}

export function updatePolicy(policyId: number, input: PolicyInputPayload): Promise<PolicyWriteResponse> {
  return apiRequest<PolicyWriteResponse>(`/policies/${policyId}`, {
    method: 'PATCH',
    body: input as unknown as Record<string, unknown>,
  });
}

export function deletePolicy(policyId: number): Promise<DeletedResponse> {
  return apiRequest<DeletedResponse>(`/policies/${policyId}`, { method: 'DELETE' });
}
