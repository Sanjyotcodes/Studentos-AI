'use client';

import type { Note } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { getNote } from '@/modules/notes/api/notes.api';
import { noteQueryKey } from '@/modules/notes/hooks/queryKeys';

export function useNote(id: string) {
  return useQuery<Note>({
    queryKey: noteQueryKey(id),
    queryFn: () => getNote(id),
  });
}
