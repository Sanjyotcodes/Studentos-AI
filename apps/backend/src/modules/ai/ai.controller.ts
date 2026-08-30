// AI request handlers — parse (validate.middleware already ran) → fetch the
// already-computed attendance numbers → delegate the model call to
// ai.service.ts → shape the response. Never imports @anthropic-ai/sdk itself.
import type { AiQueryInput, SummarizeNoteInput } from '@studentos/shared';
import { catchAsync } from '../../lib/catchAsync';
import * as attendanceService from '../attendance/attendance.service';
import * as notesService from '../notes/notes.service';
import * as aiService from './ai.service';

export const query = catchAsync(async (req, res) => {
  const { question } = req.body as AiQueryInput;
  const summary = await attendanceService.getAttendanceSummary(req.user!.id, {});
  const result = await aiService.answerQuery(question, summary);
  res.status(200).json({ success: true, data: { answer: result.text, refused: result.refused } });
});

export const summary = catchAsync(async (req, res) => {
  const attendanceSummary = await attendanceService.getAttendanceSummary(req.user!.id, {});
  const result = await aiService.generateSummary(attendanceSummary);
  res.status(200).json({ success: true, data: { summary: result.text, refused: result.refused } });
});

// Phase 12: note summarization also routes through ai.service.ts, the only
// file allowed to call the Gemini API (PLAN.md §4, invariant 4) — this
// controller only fetches the (ownership-checked) note and flattens its
// blocks to plain text before handing off.
export const summarizeNote = catchAsync(async (req, res) => {
  const { noteId } = req.body as SummarizeNoteInput;
  const note = await notesService.getOwnedNoteOrThrow(req.user!.id, noteId);
  const noteText = notesService.noteBlocksToPlainText(note.blocks);
  const result = await aiService.summarizeNote(noteText);
  res.status(200).json({ success: true, data: { summary: result.text, refused: result.refused } });
});
