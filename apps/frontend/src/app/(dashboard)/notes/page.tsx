'use client';

import { FileText, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { NoteListItem } from '@/modules/notes/components/NoteListItem';
import { useCreateNote } from '@/modules/notes/hooks/useCreateNote';
import { useNotes } from '@/modules/notes/hooks/useNotes';

export default function NotesPage() {
  const notesQuery = useNotes();
  const createNote = useCreateNote();
  const router = useRouter();

  const onNewNote = () => {
    createNote.mutate(
      { title: 'Untitled', blocks: [] },
      { onSuccess: (note) => router.push(`/notes/${note.id}`) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notes</h1>
        <Button onClick={onNewNote} disabled={createNote.isPending}>
          <Plus className="h-4 w-4" />
          New note
        </Button>
      </div>

      {notesQuery.isLoading && <LoadingBlock label="Loading your notes…" />}
      {notesQuery.isError && <ErrorState onRetry={() => notesQuery.refetch()} />}

      {notesQuery.data && notesQuery.data.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Create your first note — lecture summaries, revision points, anything worth keeping."
        />
      )}

      {notesQuery.data && notesQuery.data.length > 0 && (
        <div className="space-y-2">
          {notesQuery.data.map((note) => (
            <NoteListItem key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
