// Typed calls to the backend's /notes and /ai/summarize-note routes. All go
// through apiClient (T7.9-style invariant) — nothing here calls fetch directly.
import type {
  AiNoteSummaryResult,
  CreateNoteInput,
  Note,
  NoteFilterQuery,
  UpdateNoteInput,
} from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

function toQueryString(query: NoteFilterQuery): string {
  const params = new URLSearchParams();
  if (query.subjectId) params.set('subjectId', query.subjectId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listNotes(query: NoteFilterQuery = {}): Promise<Note[]> {
  return apiClient.get<Note[]>(`/notes${toQueryString(query)}`);
}

export function getNote(id: string): Promise<Note> {
  return apiClient.get<Note>(`/notes/${id}`);
}

export function createNote(input: CreateNoteInput): Promise<Note> {
  return apiClient.post<Note>('/notes', input);
}

export function updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
  return apiClient.patch<Note>(`/notes/${id}`, input);
}

export function deleteNote(id: string): Promise<void> {
  return apiClient.delete<void>(`/notes/${id}`);
}

export function summarizeNote(noteId: string): Promise<AiNoteSummaryResult> {
  return apiClient.post<AiNoteSummaryResult>('/ai/summarize-note', { noteId });
}
