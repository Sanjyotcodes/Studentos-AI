// Root API router — mounts each module's routes under /api.
import { Router } from 'express';
import { isDatabaseReachable } from '../lib/health';
import { aiRouter } from '../modules/ai/ai.routes';
import { attendanceRouter } from '../modules/attendance/attendance.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { examDatesRouter } from '../modules/examDates/examDates.routes';
import { gradesRouter } from '../modules/grades/grades.routes';
import { notesRouter } from '../modules/notes/notes.routes';
import { plannerRouter } from '../modules/planner/planner.routes';
import { subjectsRouter } from '../modules/subjects/subjects.routes';
import { tasksRouter } from '../modules/tasks/tasks.routes';
import { timetableRouter } from '../modules/timetable/timetable.routes';

export const apiRouter = Router();

// T15.4: reports DB connectivity, not just "the process is up" — a 200 with
// no DB check would tell a load balancer/uptime monitor the app is healthy
// while every real request fails against an unreachable database.
apiRouter.get('/health', async (_req, res) => {
  const dbReachable = await isDatabaseReachable();
  if (!dbReachable) {
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is unreachable.' },
    });
    return;
  }
  res.status(200).json({ success: true, data: { status: 'ok', db: 'connected' } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/subjects', subjectsRouter);
apiRouter.use('/attendance', attendanceRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/notes', notesRouter);
apiRouter.use('/exam-dates', examDatesRouter);
apiRouter.use('/study-plan', plannerRouter);
apiRouter.use('/grades', gradesRouter);
apiRouter.use('/timetable', timetableRouter);
