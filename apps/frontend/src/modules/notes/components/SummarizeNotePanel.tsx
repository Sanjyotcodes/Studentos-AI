'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { useSummarizeNote } from '@/modules/notes/hooks/useSummarizeNote';
import { cn } from '@/lib/utils';

// T12.7: summarize button + loading/error/refused states, mirroring
// modules/ai/components/InsightsPanel.tsx's shape for the attendance summary.
export function SummarizeNotePanel({ noteId }: { noteId: string }) {
  const summarize = useSummarizeNote();

  const errorMessage =
    summarize.error instanceof ApiClientError
      ? summarize.error.message
      : summarize.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          AI summary
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => summarize.mutate(noteId)}
          disabled={summarize.isPending}
        >
          {summarize.isPending ? 'Summarizing…' : 'Summarize'}
        </Button>
      </div>

      {summarize.isError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
      {summarize.isSuccess && (
        <p
          role="status"
          className={cn(
            'rounded-md px-3 py-2 text-sm',
            summarize.data.refused && 'bg-muted text-muted-foreground',
          )}
        >
          {summarize.data.summary}
        </p>
      )}
    </div>
  );
}
