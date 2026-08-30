import type { MarkFilterQuery } from '@studentos/shared';

export const marksQueryKey = (query: MarkFilterQuery = {}) => ['marks', query.subjectId ?? 'any'] as const;
export const gradesSummaryQueryKey = ['grades-summary'] as const;
