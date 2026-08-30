'use client';

import type { Task } from '@studentos/shared';
import { ListTodo } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { QuickAddTask } from '@/modules/tasks/components/QuickAddTask';
import { TaskListItem } from '@/modules/tasks/components/TaskListItem';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { groupTasks } from '@/modules/tasks/utils/display';

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  emphasize?: boolean;
}

function TaskSection({ title, tasks, emphasize }: TaskSectionProps) {
  if (tasks.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className={emphasize ? 'text-sm font-semibold text-destructive' : 'text-sm font-semibold text-muted-foreground'}>
        {title} ({tasks.length})
      </h2>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskListItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const tasksQuery = useTasks();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tasks</h1>

      <QuickAddTask />

      {tasksQuery.isLoading && <LoadingBlock label="Loading your tasks…" />}
      {tasksQuery.isError && <ErrorState onRetry={() => tasksQuery.refetch()} />}

      {tasksQuery.data && tasksQuery.data.length === 0 && (
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          description="Add your first task above — assignments, readings, anything with a deadline."
        />
      )}

      {tasksQuery.data && tasksQuery.data.length > 0 && (
        <div className="space-y-5">
          {(() => {
            const groups = groupTasks(tasksQuery.data);
            return (
              <>
                <TaskSection title="Overdue" tasks={groups.overdue} emphasize />
                <TaskSection title="Today" tasks={groups.today} />
                <TaskSection title="Upcoming" tasks={groups.upcoming} />
                <TaskSection title="No due date" tasks={groups.noDueDate} />
                <TaskSection title="Completed" tasks={groups.completed} />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
