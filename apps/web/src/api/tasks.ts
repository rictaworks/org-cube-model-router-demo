/** F3：タスク管理のAPI呼び出し（apps/api/src/routes/tasks.ts に対応）。 */
import { apiRequest } from './client.js';
import type { DeletedResponse, TaskInputPayload, TaskWriteResponse, TasksResponse } from './types.js';

export function fetchTasks(): Promise<TasksResponse> {
  return apiRequest<TasksResponse>('/tasks');
}

export function createTask(input: TaskInputPayload): Promise<TaskWriteResponse> {
  return apiRequest<TaskWriteResponse>('/tasks', { method: 'POST', body: input as unknown as Record<string, unknown> });
}

export function updateTask(taskId: number, input: TaskInputPayload): Promise<TaskWriteResponse> {
  return apiRequest<TaskWriteResponse>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: input as unknown as Record<string, unknown>,
  });
}

export function deleteTask(taskId: number): Promise<DeletedResponse> {
  return apiRequest<DeletedResponse>(`/tasks/${taskId}`, { method: 'DELETE' });
}
