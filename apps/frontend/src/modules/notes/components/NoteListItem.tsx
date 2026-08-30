'use client';

import type { Note } from '@studentos/shared';
import { FileText, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDeleteNote } from '@/modules/notes/hooks/useDeleteNote';

export function NoteListItem({ note }: { note: Note }) {
  const deleteNote = useDeleteNote();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
      <Link href={`/notes/${note.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{note.title}</p>
          <p className="text-xs text-muted-foreground">
            {note.blocks.length} block{note.blocks.length === 1 ? '' : 's'} · updated{' '}
            {new Date(note.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${note.title}`}
        disabled={deleteNote.isPending}
        onClick={(e) => {
          e.preventDefault();
          deleteNote.mutate(note.id);
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
