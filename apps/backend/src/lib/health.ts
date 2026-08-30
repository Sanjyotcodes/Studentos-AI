// DB-connectivity probe for GET /api/health (Phase 15, T15.4). A separate,
// directly-testable function rather than inline route logic, so a test can
// mock ../lib/prisma's `$queryRaw` to simulate an unreachable database
// without needing to actually take a real connection down.
import { logger } from './logger';
import { prisma } from './prisma';

export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    // Diagnostic only — never reaches the client (GET /api/health only ever
    // returns the generic {status, db} shape). logger.ts redacts secret
    // values wherever they appear, so logging the raw message here is safe,
    // and it's the only way to see *why* the DB is unreachable instead of
    // just the fact that it is.
    logger.error('Database health check failed', {
      errorName: err instanceof Error ? err.name : typeof err,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
