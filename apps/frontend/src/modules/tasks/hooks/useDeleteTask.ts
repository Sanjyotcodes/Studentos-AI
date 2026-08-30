'use client';

import type { Task } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTask } from '@/modules/tasks/api/tasks.api';
import { tasksQueryKey } from '@/modules/tasks/hooks/queryKeys';

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteTask,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Task[]>(tasksQueryKey(), (old) => (old ? old.filter((t) => t.id !== id) : old));
    },
  });
}
