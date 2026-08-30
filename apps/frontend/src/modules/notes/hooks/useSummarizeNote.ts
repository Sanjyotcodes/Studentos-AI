'use client';

import type { AiNoteSummaryResult } from '@studentos/shared';
import { useMutation } from '@tanstack/react-query';
import { summarizeNote } from '@/modules/notes/api/notes.api';

// One-shot, not persisted (Phase 12 non-goal: no chat history) — mirrors
// modules/ai/hooks/useAskAi.ts's shape.
export function useSummarizeNote() {
  return useMutation<AiNoteSummaryResult, Error, string>({
    mutationFn: summarizeNote,
  });
}
