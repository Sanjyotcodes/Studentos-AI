'use client';

import type { Task } from '@studentos/shared';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteTask } from '@/modules/tasks/hooks/useDeleteTask';
import { useUpdateTask } from '@/modules/tasks/hooks/useUpdateTask';
import { formatDueDateLabel, isDone, isOverdue, priorityBadgeClass, priorityLabel } from '@/modules/tasks/utils/display';
import { cn } from '@/lib/utils';

interface TaskListItemProps {
  task: Task;
}

export function TaskListItem({ task }: TaskListItemProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const done = isDone(task);
  const overdue = isOverdue(task);

  const toggleComplete = () => {
    // Idempotent target-state PATCH (matches the backend's T11.6 design) —
    // optimistic via useUpdateTask, rolled back on failure (T11.9).
    updateTask.mutate({ id: task.id, input: { status: done ? 'TODO' : 'DONE' } });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
        onClick={toggleComplete}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          done ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-accent',
        )}
      >
        {done && <Check className="h-3 w-3" />}
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn('truncate text-sm font-medium', done && 'text-muted-foreground line-through')}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {task.dueDate && (
            <span className={cn('font-medium', overdue ? 'text-destructive' : 'text-muted-foreground')}>
              {overdue ? 'Overdue · ' : ''}
              {formatDueDateLabel(task.dueDate)}
            </span>
          )}
          <span className={cn('rounded-full px-2 py-0.5 font-medium', priorityBadgeClass(task.priority))}>
            {priorityLabel(task.priority)}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete "${task.title}"`}
        onClick={() => deleteTask.mutate(task.id)}
        disabled={deleteTask.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
