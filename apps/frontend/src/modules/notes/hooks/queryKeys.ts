import type { NoteFilterQuery } from '@studentos/shared';

export const notesQueryKey = (query: NoteFilterQuery = {}) => ['notes', query.subjectId ?? 'any'] as const;
export const noteQueryKey = (id: string) => ['notes', 'detail', id] as const;
