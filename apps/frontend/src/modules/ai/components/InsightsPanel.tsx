'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/ErrorState';
import { Input } from '@/components/ui/input';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { ApiClientError } from '@/lib/api-client';
import { useAiSummary } from '@/modules/ai/hooks/useAiSummary';
import { useAskAi } from '@/modules/ai/hooks/useAskAi';
import { cn } from '@/lib/utils';

// The dashboard's AI insights panel: a generated standing summary (loads on
// mount) plus a one-shot "ask a question" form. Loading, error, and refusal
// states are each visually distinct (T10.13) — refused answers are muted
// rather than styled as either a normal answer or an error, since a refusal
// is neither.
export function InsightsPanel() {
  const summaryQuery = useAiSummary();
  const askAi = useAskAi();
  const [question, setQuestion] = useState('');

  const onAsk = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || askAi.isPending) return;
    askAi.mutate({ question: trimmed });
  };

  const askErrorMessage =
    askAi.error instanceof ApiClientError
      ? askAi.error.message
      : askAi.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaryQuery.isLoading && <LoadingBlock label="Generating your summary…" />}
        {summaryQuery.isError && (
          <ErrorState
            message={
              summaryQuery.error instanceof ApiClientError ? summaryQuery.error.message : undefined
            }
            onRetry={() => summaryQuery.refetch()}
          />
        )}
        {summaryQuery.data && (
          <p
            className={cn(
              'text-sm',
              summaryQuery.data.refused && 'rounded-md bg-muted px-3 py-2 text-muted-foreground',
            )}
          >
            {summaryQuery.data.summary}
          </p>
        )}

        <form onSubmit={onAsk} className="space-y-1.5">
          <label htmlFor="ai-question" className="text-sm font-medium">
            Ask about your attendance
          </label>
          <div className="flex gap-2">
            <Input
              id="ai-question"
              placeholder="How many classes can I miss in DBMS?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={askAi.isPending}
            />
            <Button type="submit" disabled={askAi.isPending || !question.trim()}>
              {askAi.isPending ? 'Asking…' : 'Ask'}
            </Button>
          </div>
        </form>

        {askAi.isError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {askErrorMessage}
          </p>
        )}
        {askAi.isSuccess && (
          <p
            role="status"
            className={cn(
              'rounded-md px-3 py-2 text-sm',
              askAi.data.refused ? 'bg-muted text-muted-foreground' : 'bg-accent',
            )}
          >
            {askAi.data.answer}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
