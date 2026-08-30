// Notes request handlers — parse (already done by validate.middleware) →
// delegate to the service → shape the response.
import type { NoteFilterQuery } from '@studentos/shared';
import { catchAsync } from '../../lib/catchAsync';
import * as notesService from './notes.service';

export const list = catchAsync(async (req, res) => {
  const query = req.query as unknown as NoteFilterQuery;
  const notes = await notesService.listNotes(req.user!.id, query);
  res.status(200).json({ success: true, data: notes });
});

export const create = catchAsync(async (req, res) => {
  const note = await notesService.createNote(req.user!.id, req.body);
  res.status(201).json({ success: true, data: note });
});

export const getOne = catchAsync(async (req, res) => {
  const note = await notesService.getOwnedNoteOrThrow(req.user!.id, req.params.id!);
  res.status(200).json({ success: true, data: note });
});

export const update = catchAsync(async (req, res) => {
  const note = await notesService.updateNote(req.user!.id, req.params.id!, req.body);
  res.status(200).json({ success: true, data: note });
});

export const remove = catchAsync(async (req, res) => {
  await notesService.deleteNote(req.user!.id, req.params.id!);
  res.status(204).send();
});
