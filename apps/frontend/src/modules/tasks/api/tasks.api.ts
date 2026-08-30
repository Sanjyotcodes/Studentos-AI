// Typed calls to the backend's /tasks routes. All go through apiClient
// (T7.9-style invariant) — nothing here calls fetch directly.
import type { CreateTaskInput, Task, TaskFilterQuery, UpdateTaskInput } from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

function toQueryString(query: TaskFilterQuery): string {
  const params = new URLSearchParams();
  if (query.subjectId) params.set('subjectId', query.subjectId);
  if (query.status) params.set('status', query.status);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listTasks(query: TaskFilterQuery = {}): Promise<Task[]> {
  return apiClient.get<Task[]>(`/tasks${toQueryString(query)}`);
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return apiClient.post<Task>('/tasks', input);
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return apiClient.patch<Task>(`/tasks/${id}`, input);
}

export function deleteTask(id: string): Promise<void> {
  return apiClient.delete<void>(`/tasks/${id}`);
}
