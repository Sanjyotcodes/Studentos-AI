'use client';

import type { Note, UpdateNoteInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateNote } from '@/modules/notes/api/notes.api';
import { noteQueryKey, notesQueryKey } from '@/modules/notes/hooks/queryKeys';

interface UpdateNoteVariables {
  id: string;
  input: UpdateNoteInput;
}

// A plain save (explicit button, not an optimistic edit) — the block editor
// shows its own pending/error state rather than needing a rollback (T12.6).
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation<Note, Error, UpdateNoteVariables>({
    mutationFn: ({ id, input }) => updateNote(id, input),
    onSuccess: (note) => {
      queryClient.setQueryData<Note>(noteQueryKey(note.id), note);
      queryClient.invalidateQueries({ queryKey: notesQueryKey() });
    },
  });
}
