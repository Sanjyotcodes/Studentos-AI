'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api-client';
import { useCreateTask } from '@/modules/tasks/hooks/useCreateTask';

// T11.7: creates a task in one interaction (type + Enter/click) and the list
// updates immediately — the due-date field is optional and just widens what
// a single quick-add can express, it doesn't add a second step.
export function QuickAddTask() {
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;
    createTask.mutate(
      { title: trimmed, dueDate: dueDate || undefined, priority: 'MEDIUM', status: 'TODO' },
      {
        onSuccess: () => {
          setTitle('');
          setDueDate('');
        },
      },
    );
  };

  const errorMessage =
    createTask.error instanceof ApiClientError
      ? createTask.error.message
      : createTask.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="New task title"
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={createTask.isPending}
          className="flex-1"
        />
        <Input
          aria-label="Due date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={createTask.isPending}
          className="sm:w-40"
        />
        <Button type="submit" disabled={createTask.isPending || !title.trim()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
