// Purely presentational helpers — grouping and formatting only. Comparing a
// due date against "today" is a plain date comparison for display purposes,
// not the percentage/prediction arithmetic PLAN.md §4 invariant 10 forbids
// (that invariant is specific to attendance).
import type { Task, TaskPriority } from '@studentos/shared';

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(task: Task): boolean {
  return task.status !== 'DONE' && task.dueDate !== null && task.dueDate < todayDateOnly();
}

export function isDone(task: Task): boolean {
  return task.status === 'DONE';
}

export interface TaskGroups {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  noDueDate: Task[];
  completed: Task[];
}

export function groupTasks(tasks: Task[]): TaskGroups {
  const today = todayDateOnly();
  const groups: TaskGroups = { overdue: [], today: [], upcoming: [], noDueDate: [], completed: [] };

  for (const task of tasks) {
    if (isDone(task)) {
      groups.completed.push(task);
      continue;
    }
    if (task.dueDate === null) {
      groups.noDueDate.push(task);
    } else if (task.dueDate < today) {
      groups.overdue.push(task);
    } else if (task.dueDate === today) {
      groups.today.push(task);
    } else {
      groups.upcoming.push(task);
    }
  }

  return groups;
}

export function formatDueDateLabel(dueDate: string): string {
  const date = new Date(`${dueDate}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function priorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    case 'LOW':
      return 'Low';
  }
}

export function priorityBadgeClass(priority: TaskPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-destructive/10 text-destructive';
    case 'MEDIUM':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'LOW':
      return 'bg-muted text-muted-foreground';
  }
}
