'use client';

import type { Task, TaskFilterQuery } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { listTasks } from '@/modules/tasks/api/tasks.api';
import { tasksQueryKey } from '@/modules/tasks/hooks/queryKeys';

export function useTasks(query: TaskFilterQuery = {}) {
  return useQuery<Task[]>({
    queryKey: tasksQueryKey(query),
    queryFn: () => listTasks(query),
  });
}
