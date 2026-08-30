'use client';

import type { Note } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteNote } from '@/modules/notes/api/notes.api';
import { notesQueryKey } from '@/modules/notes/hooks/queryKeys';

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteNote,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Note[]>(notesQueryKey(), (old) => (old ? old.filter((n) => n.id !== id) : old));
    },
  });
}
