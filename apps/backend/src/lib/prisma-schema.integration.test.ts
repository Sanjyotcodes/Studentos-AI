// Phase 2 (T2.5–T2.7): proves the invariants that must hold at the database
// level, not merely be discouraged in application code — duplicate attendance
// per (subject, date), cascade delete from User, and FK enforcement on a bad
// userId. Requires a reachable Postgres at DATABASE_URL (see docker-compose.yml).
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from './prisma';

async function createTestUser() {
  return prisma.user.create({
    data: {
      name: 'Schema Test User',
      email: `schema-test-${randomUUID()}@studentos.dev`,
      passwordHash: 'not-a-real-hash',
    },
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AttendanceRecord unique constraint (T2.5)', () => {
  it('rejects a second attendance record for the same subject + date', async () => {
    const user = await createTestUser();
    const subject = await prisma.subject.create({
      data: { userId: user.id, name: 'Test Subject', code: 'T-101' },
    });
    const date = new Date('2026-01-15T00:00:00.000Z');

    await prisma.attendanceRecord.create({
      data: { subjectId: subject.id, date, status: 'PRESENT' },
    });

    await expect(
      prisma.attendanceRecord.create({
        data: { subjectId: subject.id, date, status: 'ABSENT' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe('Cascade delete from User (T2.6)', () => {
  it('deleting a User removes their Subjects and AttendanceRecords', async () => {
    const user = await createTestUser();
    const subject = await prisma.subject.create({
      data: { userId: user.id, name: 'Cascade Subject', code: 'T-202' },
    });
    const attendance = await prisma.attendanceRecord.create({
      data: { subjectId: subject.id, date: new Date('2026-01-16T00:00:00.000Z'), status: 'PRESENT' },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const [foundSubject, foundAttendance] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subject.id } }),
      prisma.attendanceRecord.findUnique({ where: { id: attendance.id } }),
    ]);

    expect(foundSubject).toBeNull();
    expect(foundAttendance).toBeNull();
  });
});

describe('Foreign key enforcement (T2.7)', () => {
  it('rejects creating a Subject with a non-existent userId', async () => {
    await expect(
      prisma.subject.create({
        data: { userId: randomUUID(), name: 'Orphan Subject', code: 'T-303' },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
