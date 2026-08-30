'use client';

import type { NoteBlock } from '@studentos/shared';
import { Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/ErrorState';
import { Input } from '@/components/ui/input';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { ApiClientError } from '@/lib/api-client';
import { useSubjects } from '@/modules/attendance/hooks/useSubjects';
import { BlockEditor } from '@/modules/notes/components/BlockEditor';
import { SummarizeNotePanel } from '@/modules/notes/components/SummarizeNotePanel';
import { useDeleteNote } from '@/modules/notes/hooks/useDeleteNote';
import { useNote } from '@/modules/notes/hooks/useNote';
import { useUpdateNote } from '@/modules/notes/hooks/useUpdateNote';

export default function NoteDetailPage() {
  const { id: noteId } = useParams<{ id: string }>();
  const router = useRouter();

  const noteQuery = useNote(noteId);
  const subjectsQuery = useSubjects();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [subjectId, setSubjectId] = useState('');
  // Guards against re-seeding local edits from a background refetch — the
  // editor state should only be initialized once per note, not every time
  // TanStack Query revalidates (T12.6: edits must survive, not get clobbered).
  const initializedNoteId = useRef<string | null>(null);

  useEffect(() => {
    if (noteQuery.data && initializedNoteId.current !== noteQuery.data.id) {
      setTitle(noteQuery.data.title);
      setBlocks(noteQuery.data.blocks);
      setSubjectId(noteQuery.data.subjectId ?? '');
      initializedNoteId.current = noteQuery.data.id;
    }
  }, [noteQuery.data]);

  const onSave = () => {
    updateNote.mutate({
      id: noteId,
      input: { title: title.trim() || 'Untitled', blocks, subjectId: subjectId || null },
    });
  };

  const onDelete = () => {
    deleteNote.mutate(noteId, { onSuccess: () => router.push('/notes') });
  };

  const saveErrorMessage =
    updateNote.error instanceof ApiClientError
      ? updateNote.error.message
      : updateNote.error
        ? 'Something went wrong. Please try again.'
        : null;

  if (noteQuery.isLoading) {
    return <LoadingBlock label="Loading note…" />;
  }
  if (noteQuery.isError) {
    return <ErrorState onRetry={() => noteQuery.refetch()} />;
  }
  if (!noteQuery.data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          aria-label="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md text-lg font-semibold"
        />
        <div className="flex items-center gap-2">
          <Button onClick={onSave} disabled={updateNote.isPending}>
            {updateNote.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete note"
            onClick={onDelete}
            disabled={deleteNote.isPending}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {subjectsQuery.data && subjectsQuery.data.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="note-subject" className="text-sm text-muted-foreground">
            Subject
          </label>
          <select
            id="note-subject"
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">No subject</option>
            {subjectsQuery.data.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {updateNote.isError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveErrorMessage}
        </p>
      )}
      {updateNote.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.
        </p>
      )}

      <BlockEditor blocks={blocks} onChange={setBlocks} />

      <SummarizeNotePanel noteId={noteId} />
    </div>
  );
}
