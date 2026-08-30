// Phase 3 (T3.1–T3.4): every request schema accepts a valid payload and
// rejects the standard invalid shapes — missing required field, wrong type,
// out-of-range value, and (where relevant) format-specific rejections.
import { describe, expect, it } from 'vitest';
import {
  attendanceSummaryQuerySchema,
  createSubjectSchema,
  loginSchema,
  markAttendanceSchema,
  registerSchema,
  updateSubjectSchema,
} from './index';

describe('registerSchema', () => {
  const valid = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'correct-horse' };

  it('accepts a valid payload (T3.1)', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing required field (T3.2)', () => {
    const { name: _name, ...withoutName } = valid;
    expect(registerSchema.safeParse(withoutName).success).toBe(false);
  });

  it('rejects the wrong type for a field (T3.2)', () => {
    expect(registerSchema.safeParse({ ...valid, name: 12345 }).success).toBe(false);
  });

  it('rejects an invalid email (T3.3)', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a too-short password (T3.3)', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  const valid = { email: 'ada@example.com', password: 'anything' };

  it('accepts a valid payload (T3.1)', () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing required field (T3.2)', () => {
    expect(loginSchema.safeParse({ email: valid.email }).success).toBe(false);
  });

  it('rejects an invalid email (T3.3)', () => {
    expect(loginSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });
});

describe('createSubjectSchema', () => {
  const valid = { name: 'Data Structures', code: 'DSA101' };

  it('accepts a valid payload and defaults minAttendancePercent (T3.1)', () => {
    const result = createSubjectSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minAttendancePercent).toBe(75);
    }
  });

  it('rejects a missing required field (T3.2)', () => {
    expect(createSubjectSchema.safeParse({ name: 'Data Structures' }).success).toBe(false);
  });

  it('rejects the wrong type for a field (T3.2)', () => {
    expect(createSubjectSchema.safeParse({ ...valid, code: 12345 }).success).toBe(false);
  });

  it('rejects an out-of-range minAttendancePercent (T3.2)', () => {
    expect(createSubjectSchema.safeParse({ ...valid, minAttendancePercent: 150 }).success).toBe(
      false,
    );
  });
});

describe('updateSubjectSchema', () => {
  it('accepts a valid partial payload (T3.1)', () => {
    expect(updateSubjectSchema.safeParse({ name: 'Renamed Subject' }).success).toBe(true);
  });

  it('accepts an empty payload (all fields optional)', () => {
    expect(updateSubjectSchema.safeParse({}).success).toBe(true);
  });

  it('rejects the wrong type for a field (T3.2)', () => {
    expect(updateSubjectSchema.safeParse({ minAttendancePercent: 'seventy' }).success).toBe(false);
  });

  it('rejects an out-of-range minAttendancePercent (T3.2)', () => {
    expect(updateSubjectSchema.safeParse({ minAttendancePercent: 150 }).success).toBe(false);
  });
});

describe('markAttendanceSchema', () => {
  const valid = {
    subjectId: '11111111-1111-1111-1111-111111111111',
    date: '2026-01-15',
    status: 'PRESENT',
  };

  it('accepts a valid payload (T3.1)', () => {
    expect(markAttendanceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing required field (T3.2)', () => {
    const { date: _date, ...withoutDate } = valid;
    expect(markAttendanceSchema.safeParse(withoutDate).success).toBe(false);
  });

  it('rejects the wrong type for a field (T3.2)', () => {
    expect(markAttendanceSchema.safeParse({ ...valid, date: 20260115 }).success).toBe(false);
  });

  it('rejects an unknown attendance status (T3.4)', () => {
    expect(markAttendanceSchema.safeParse({ ...valid, status: 'LATE' }).success).toBe(false);
  });
});

describe('attendanceSummaryQuerySchema', () => {
  it('accepts a valid payload (T3.1)', () => {
    expect(
      attendanceSummaryQuerySchema.safeParse({
        subjectId: '11111111-1111-1111-1111-111111111111',
        from: '2026-01-01',
        to: '2026-01-31',
      }).success,
    ).toBe(true);
  });

  it('accepts an empty query (every field optional)', () => {
    expect(attendanceSummaryQuerySchema.safeParse({}).success).toBe(true);
  });

  it('rejects the wrong type for a field (T3.2)', () => {
    expect(attendanceSummaryQuerySchema.safeParse({ from: 20260101 }).success).toBe(false);
  });

  it('rejects a malformed date (T3.2)', () => {
    expect(attendanceSummaryQuerySchema.safeParse({ from: '01/01/2026' }).success).toBe(false);
  });
});
