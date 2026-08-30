'use client';

import type { AiQueryInput, AiQueryResult } from '@studentos/shared';
import { useMutation } from '@tanstack/react-query';
import { askAiQuestion } from '@/modules/ai/api/ai.api';

// No chat history persistence (Phase 10 non-goal) — this is a one-shot
// question/answer, not a conversation, so there's no cache to invalidate.
export function useAskAi() {
  return useMutation<AiQueryResult, Error, AiQueryInput>({
    mutationFn: askAiQuestion,
  });
}
