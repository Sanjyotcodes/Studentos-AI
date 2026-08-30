'use client';

import type { Task, UpdateTaskInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTask } from '@/modules/tasks/api/tasks.api';
import { tasksQueryKey } from '@/modules/tasks/hooks/queryKeys';

interface UpdateTaskVariables {
  id: string;
  input: UpdateTaskInput;
}

interface MutationContext {
  previousTasks?: Task[];
}

// Optimistic — the completion checkbox (T11.9) needs instant feedback, and a
// plain field edit benefits from the same responsiveness. On error, the
// pre-mutation snapshot is restored exactly (rollback), not recomputed.
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, UpdateTaskVariables, MutationContext>({
    mutationFn: ({ id, input }) => updateTask(id, input),
    onMutate: async ({ id, input }) => {
      const key = tasksQueryKey();
      await queryClient.cancelQueries({ queryKey: key });
      const previousTasks = queryClient.getQueryData<Task[]>(key);

      // Plain object spread is correct here: UpdateTaskInput only includes
      // the keys actually being changed, so untouched fields on `task` are
      // left alone, and an explicit `null` (e.g. clearing dueDate) overwrites
      // correctly since it IS present as a key.
      queryClient.setQueryData<Task[]>(key, (old) =>
        old ? old.map((task) => (task.id === id ? { ...task, ...input } : task)) : old,
      );

      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(tasksQueryKey(), context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey() });
    },
  });
}
