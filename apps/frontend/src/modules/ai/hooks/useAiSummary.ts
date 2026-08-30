'use client';

import type { AiSummaryResult } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { getAiSummary } from '@/modules/ai/api/ai.api';
import { aiSummaryQueryKey } from '@/modules/ai/hooks/queryKeys';

// A generated read on the student's current standing (GET /api/ai/summary).
// Not retried on failure — the backend already maps upstream AI failures to
// a graceful error envelope (502/503/504), and the per-user rate limit
// (T10.9) means blindly retrying could burn the student's hourly AI quota.
export function useAiSummary() {
  return useQuery<AiSummaryResult>({
    queryKey: aiSummaryQueryKey,
    queryFn: getAiSummary,
    retry: false,
    staleTime: 5 * 60_000,
  });
}
