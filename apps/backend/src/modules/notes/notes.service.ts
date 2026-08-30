// Notes business logic and data access. Every query/mutation is scoped by
// userId (PLAN.md §4, invariant 11) — a user can only ever see or touch
// their own notes, and can only ever link a note to a subject they own.
import type { CreateNoteInput, Note, NoteFilterQuery, UpdateNoteInput } from '@studentos/shared';
import type { Prisma } from '@prisma/client';
import { NotFoundError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';

function toPublicNote(note: {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  blocks: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): Note {
  return {
    id: note.id,
    userId: note.userId,
    subjectId: note.subjectId,
    title: note.title,
    // Blocks are only ever written through createNoteSchema/updateNoteSchema
    // (validated at the route layer), so this cast is safe — there is no
    // path that writes an unvalidated shape into this column.
    blocks: note.blocks as unknown as Note['blocks'],
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

async function assertSubjectOwnedByUser(userId: string, subjectId: string): Promise<void> {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError('Subject not found');
  }
}

async function findOwnedNoteRowOrThrow(userId: string, noteId: string) {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!note) {
    throw new NotFoundError('Note not found');
  }
  return note;
}

export async function listNotes(userId: string, query: NoteFilterQuery): Promise<Note[]> {
  const notes = await prisma.note.findMany({
    where: {
      userId,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });
  return notes.map(toPublicNote);
}

export async function createNote(userId: string, input: CreateNoteInput): Promise<Note> {
  if (input.subjectId) {
    await assertSubjectOwnedByUser(userId, input.subjectId);
  }

  const note = await prisma.note.create({
    data: {
      userId,
      subjectId: input.subjectId,
      title: input.title,
      blocks: input.blocks as unknown as Prisma.InputJsonValue,
    },
  });
  return toPublicNote(note);
}

export async function getOwnedNoteOrThrow(userId: string, noteId: string): Promise<Note> {
  const note = await findOwnedNoteRowOrThrow(userId, noteId);
  return toPublicNote(note);
}

export async function updateNote(userId: string, noteId: string, input: UpdateNoteInput): Promise<Note> {
  await findOwnedNoteRowOrThrow(userId, noteId);

  if (input.subjectId) {
    await assertSubjectOwnedByUser(userId, input.subjectId);
  }

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
      ...(input.blocks !== undefined ? { blocks: input.blocks as unknown as Prisma.InputJsonValue } : {}),
    },
  });
  return toPublicNote(updated);
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  await findOwnedNoteRowOrThrow(userId, noteId);
  await prisma.note.delete({ where: { id: noteId } });
}

// Flattens a note's blocks into plain text for the AI summarization endpoint
// (ai.controller.ts's summarizeNote handler) — the model receives readable
// text, never the raw block JSON structure.
export function noteBlocksToPlainText(blocks: Note['blocks']): string {
  const parts = blocks.map((block) => {
    switch (block.type) {
      case 'paragraph':
        return block.text;
      case 'heading':
        return block.text;
      case 'list':
        return block.items.join('\n');
      case 'code':
        return block.code;
      default:
        return '';
    }
  });
  return parts.join('\n\n').trim();
}
