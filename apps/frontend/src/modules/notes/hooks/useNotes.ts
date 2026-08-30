'use client';

import type { Note, NoteFilterQuery } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { listNotes } from '@/modules/notes/api/notes.api';
import { notesQueryKey } from '@/modules/notes/hooks/queryKeys';

export function useNotes(query: NoteFilterQuery = {}) {
  return useQuery<Note[]>({
    queryKey: notesQueryKey(query),
    queryFn: () => listNotes(query),
  });
}
