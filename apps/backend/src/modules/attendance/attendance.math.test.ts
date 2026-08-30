// Phase 6 (T6.8–T6.14): the percentage/prediction formulas, tested directly
// and without a database — these are pure functions of (attended, total,
// cutoffFraction). DB-scoped behavior (ownership, filtering, cancellation
// exclusion end-to-end) is covered separately in attendance.integration.test.ts.
import { describe, expect, it } from 'vitest';
import { computeCanMiss, computeMustAttend, computePercentage } from './attendance.service';

describe('computePercentage', () => {
  it('T6.8: 8 attended of 10 is exactly 80', () => {
    expect(computePercentage(8, 10)).toBe(80);
  });

  it('T6.9: zero total classes is null, never NaN', () => {
    const result = computePercentage(0, 0);
    expect(result).toBeNull();
    expect(Number.isNaN(result)).toBe(false);
  });
});

describe('computeCanMiss', () => {
  it('T6.11: cutoff 75%, 30/40 attended -> 0 (already exactly at cutoff)', () => {
    expect(computeCanMiss(30, 40, 0.75)).toBe(0);
  });

  it('T6.12: cutoff 75%, 40/40 attended -> 13', () => {
    expect(computeCanMiss(40, 40, 0.75)).toBe(13);
    // Sanity-check the boundary itself: 13 is missable, 14 is not.
    expect(40 / (40 + 13)).toBeGreaterThanOrEqual(0.75);
    expect(40 / (40 + 14)).toBeLessThan(0.75);
  });

  it('never goes negative when already below cutoff', () => {
    expect(computeCanMiss(5, 20, 0.75)).toBe(0);
  });
});

describe('computeMustAttend', () => {
  it('T6.13: cutoff 75%, 10/20 attended -> 20', () => {
    expect(computeMustAttend(10, 20, 0.75)).toBe(20);
    // Sanity-check the boundary itself: (10+20)/(20+20) = 30/40 = 0.75 exactly.
    expect((10 + 20) / (20 + 20)).toBeCloseTo(0.75, 10);
    expect((10 + 19) / (20 + 19)).toBeLessThan(0.75);
  });

  it('is 0 once a subject already meets its cutoff', () => {
    expect(computeMustAttend(30, 40, 0.75)).toBe(0);
  });
});

describe('T6.14: a subject below cutoff reports mustAttend > 0 and canMiss === 0', () => {
  it('holds for a representative below-cutoff subject', () => {
    const attended = 10;
    const total = 20;
    const cutoffFraction = 0.75;

    expect(computeCanMiss(attended, total, cutoffFraction)).toBe(0);
    expect(computeMustAttend(attended, total, cutoffFraction)).toBeGreaterThan(0);
  });
});
