// Reusable :id route-param validator shared by every feature module with a
// `/:id` route (subjects, attendance, and later tasks/notes/grades). Backend-
// internal — the frontend only ever sees an id as a plain string in a URL
// path, so this doesn't belong in @studentos/shared.
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});
export type IdParam = z.infer<typeof idParamSchema>;
