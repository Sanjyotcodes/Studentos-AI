// Typed calls to the backend's /ai routes. All go through api-client
// (T7.9/T9.15-style invariant) — nothing here calls fetch directly, and
// nothing here does any arithmetic on the returned text.
import type { AiQueryInput, AiQueryResult, AiSummaryResult } from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

export function askAiQuestion(input: AiQueryInput): Promise<AiQueryResult> {
  return apiClient.post<AiQueryResult>('/ai/query', input);
}

export function getAiSummary(): Promise<AiSummaryResult> {
  return apiClient.get<AiSummaryResult>('/ai/summary');
}
