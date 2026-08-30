'use client';

import type { CreateNoteInput, Note } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createNote } from '@/modules/notes/api/notes.api';
import { notesQueryKey } from '@/modules/notes/hooks/queryKeys';

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation<Note, Error, CreateNoteInput>({
    mutationFn: createNote,
    onSuccess: (note) => {
      queryClient.setQueryData<Note[]>(notesQueryKey(), (old) => (old ? [note, ...old] : [note]));
    },
  });
}
