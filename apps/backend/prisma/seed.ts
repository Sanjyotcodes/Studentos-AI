// Phase 2 seed data: one demo user, 5 subjects, ~30 attendance records.
//
// Idempotent by design — every write is an upsert keyed on a real unique
// constraint (User.email, Subject(userId,code), AttendanceRecord(subjectId,date)),
// and attendance dates are computed from "days ago at UTC midnight" so re-running
// the script on the same calendar day produces byte-identical rows rather than
// duplicates. Running it any number of times is safe.
import type { AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

const SEED_USER_EMAIL = 'demo.student@studentos.dev';
// Dev/demo credential only — never used for a real account, never read outside this script.
const SEED_USER_PASSWORD = 'demo-password-123';

const SUBJECTS = [
  { code: 'DSA101', name: 'Data Structures & Algorithms' },
  { code: 'DBMS201', name: 'Database Management Systems' },
  { code: 'OS201', name: 'Operating Systems' },
  { code: 'CN301', name: 'Computer Networks' },
  { code: 'SE301', name: 'Software Engineering' },
] as const;

// One fixed 6-day attendance pattern applied to every subject: 30 records total
// (5 subjects × 6 days), deterministic across re-runs.
const ATTENDANCE_PATTERN: AttendanceStatus[] = [
  'PRESENT',
  'PRESENT',
  'PRESENT',
  'ABSENT',
  'PRESENT',
  'CANCELLED',
];

function daysAgoAtUtcMidnight(daysAgo: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: SEED_USER_EMAIL },
    update: {},
    create: {
      name: 'Demo Student',
      email: SEED_USER_EMAIL,
      passwordHash,
    },
  });

  for (const subjectDef of SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where: { userId_code: { userId: user.id, code: subjectDef.code } },
      update: { name: subjectDef.name },
      create: {
        userId: user.id,
        code: subjectDef.code,
        name: subjectDef.name,
      },
    });

    for (const [i, status] of ATTENDANCE_PATTERN.entries()) {
      const date = daysAgoAtUtcMidnight(i + 1);

      await prisma.attendanceRecord.upsert({
        where: { subjectId_date: { subjectId: subject.id, date } },
        update: { status },
        create: { subjectId: subject.id, date, status },
      });
    }
  }

  const [subjectCount, attendanceCount] = await Promise.all([
    prisma.subject.count({ where: { userId: user.id } }),
    prisma.attendanceRecord.count({ where: { subject: { userId: user.id } } }),
  ]);

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete: user=${user.email} subjects=${subjectCount} attendanceRecords=${attendanceCount}`,
  );
}

main()
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
