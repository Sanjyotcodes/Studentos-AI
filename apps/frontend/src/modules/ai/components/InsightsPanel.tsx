'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { EASE_OUT } from '@/lib/motion';
import { spring } from '@/styles/design-tokens';
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
    <Card className="ring-gradient relative overflow-hidden">
      {/* A soft brand wash behind the AI panel so it reads as the "special"
          surface on the page without needing a louder border. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-violet/20 blur-3xl"
      />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-coral/15">
            {/* Slow pulse marks this as the live/AI surface. Decorative. */}
            <span
              aria-hidden="true"
              className="animate-pulse-ring absolute inset-0 rounded-full bg-brand-coral/40"
            />
            <Sparkles className="relative h-3.5 w-3.5 text-brand-coral" />
          </span>
          <span className="text-gradient font-bold">AI insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
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
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className={cn(
              'text-sm leading-relaxed',
              summaryQuery.data.refused && 'rounded-md bg-muted px-3 py-2 text-muted-foreground',
            )}
          >
            {summaryQuery.data.summary}
          </motion.p>
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
          <motion.p
            role="status"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring.soft}
            className={cn(
              'rounded-md px-3 py-2 text-sm leading-relaxed',
              askAi.data.refused
                ? 'bg-muted text-muted-foreground'
                : 'bg-accent text-accent-foreground',
            )}
          >
            {askAi.data.answer}
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
}
