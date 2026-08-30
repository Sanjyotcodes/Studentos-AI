'use client';

import type { CreateTaskInput, Task } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask } from '@/modules/tasks/api/tasks.api';
import { tasksQueryKey } from '@/modules/tasks/hooks/queryKeys';

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, CreateTaskInput>({
    mutationFn: createTask,
    onSuccess: (task) => {
      // Seed the cache directly so the new task appears immediately (T11.7),
      // no manual refresh needed.
      queryClient.setQueryData<Task[]>(tasksQueryKey(), (old) => (old ? [...old, task] : [task]));
    },
  });
}
