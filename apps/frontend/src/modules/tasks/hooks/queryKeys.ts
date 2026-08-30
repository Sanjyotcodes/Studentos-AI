import type { TaskFilterQuery } from '@studentos/shared';

export const tasksQueryKey = (query: TaskFilterQuery = {}) =>
  ['tasks', query.subjectId ?? 'any', query.status ?? 'any', query.from ?? 'any', query.to ?? 'any'] as const;
