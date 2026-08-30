// Phase 14 (T14.3, T14.4, T14.5, T14.6): the weighted-percentage/grade-point/
// GPA formulas, tested directly and without a database — these are pure
// functions of marks/percentages. DB-scoped behavior (ownership, CRUD,
// validation end-to-end) is covered separately in grades.integration.test.ts.
import { describe, expect, it } from 'vitest';
import {
  computeGpa,
  computeWeightedPercentage,
  percentageToGradePoint,
  roundTo2,
} from './grades.service';

describe('T14.3: computeWeightedPercentage matches a hand-computed fixture exactly', () => {
  it('three marks with weights summing to 100', () => {
    // Quiz: 8/10 @ weight 20  -> 0.8 * 20 = 16
    // Midterm: 27/30 @ weight 30 -> 0.9 * 30 = 27
    // Final: 45/60 @ weight 50 -> 0.75 * 50 = 37.5
    // Sum weighted = 80.5, sum weight = 100 -> 80.5 / 100 * 100 = 80.5
    const marks = [
      { scored: 8, max: 10, weight: 20 },
      { scored: 27, max: 30, weight: 30 },
      { scored: 45, max: 60, weight: 50 },
    ];
    expect(computeWeightedPercentage(marks)).toBe(80.5);
  });

  it('a single mark equals its own percentage regardless of weight', () => {
    expect(computeWeightedPercentage([{ scored: 9, max: 10, weight: 37 }])).toBe(90);
  });
});

describe('T14.4: GPA and per-subject percentage are defined, never NaN, with zero marks', () => {
  it('computeWeightedPercentage returns null (not NaN) with no marks', () => {
    const result = computeWeightedPercentage([]);
    expect(result).toBeNull();
    expect(Number.isNaN(result)).toBe(false);
  });

  it('computeGpa returns 0 (not NaN) with no subjects to average', () => {
    const result = computeGpa([]);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });
});

describe('T14.5: weights that do not sum to 100 are normalized by their own sum', () => {
  it('weights summing to 60 still produce a well-defined percentage', () => {
    // Quiz: 5/10 @ weight 20 -> 0.5 * 20 = 10
    // Midterm: 8/10 @ weight 40 -> 0.8 * 40 = 32
    // Sum weighted = 42, sum weight = 60 -> 42/60 * 100 = 70
    const marks = [
      { scored: 5, max: 10, weight: 20 },
      { scored: 8, max: 10, weight: 40 },
    ];
    expect(computeWeightedPercentage(marks)).toBe(70);
  });

  it('weights summing to 150 (over 100) are normalized the same way', () => {
    // Quiz: 10/10 @ weight 50 -> 50
    // Midterm: 5/10 @ weight 100 -> 50
    // Sum weighted = 100, sum weight = 150 -> 100/150 * 100 = 66.666... -> rounds to 66.67
    const marks = [
      { scored: 10, max: 10, weight: 50 },
      { scored: 5, max: 10, weight: 100 },
    ];
    expect(computeWeightedPercentage(marks)).toBeCloseTo(66.67, 2);
  });

  it('two subjects with differently-scaled weights but identical ratios produce the same percentage', () => {
    const smallWeights = [
      { scored: 8, max: 10, weight: 1 },
      { scored: 6, max: 10, weight: 1 },
    ];
    const largeWeights = [
      { scored: 8, max: 10, weight: 50 },
      { scored: 6, max: 10, weight: 50 },
    ];
    expect(computeWeightedPercentage(smallWeights)).toBe(computeWeightedPercentage(largeWeights));
  });
});

describe('T14.6: rounding follows one documented rule (roundTo2)', () => {
  it('rounds to 2 decimal places, half-up', () => {
    expect(roundTo2(66.666666)).toBe(66.67);
    expect(roundTo2(80.5)).toBe(80.5);
    expect(roundTo2(100)).toBe(100);
    expect(roundTo2(0)).toBe(0);
  });

  it('computeWeightedPercentage and computeGpa both route through roundTo2, never a second rounding rule', () => {
    // A ratio that needs rounding either way.
    const marks = [{ scored: 1, max: 3, weight: 100 }]; // 33.333...%
    expect(computeWeightedPercentage(marks)).toBe(roundTo2((1 / 3) * 100));

    const gpa = computeGpa([7, 8, 9]);
    expect(gpa).toBe(roundTo2((7 + 8 + 9) / 3));
  });
});

describe('percentageToGradePoint', () => {
  it('maps the default 10-point scale bands correctly, including boundaries', () => {
    expect(percentageToGradePoint(95)).toBe(10);
    expect(percentageToGradePoint(90)).toBe(10);
    expect(percentageToGradePoint(89.99)).toBe(9);
    expect(percentageToGradePoint(80)).toBe(9);
    expect(percentageToGradePoint(70)).toBe(8);
    expect(percentageToGradePoint(60)).toBe(7);
    expect(percentageToGradePoint(50)).toBe(6);
    expect(percentageToGradePoint(40)).toBe(5);
    expect(percentageToGradePoint(39.99)).toBe(0);
    expect(percentageToGradePoint(0)).toBe(0);
  });

  it('accepts a custom scheme (documents the "configurable" requirement)', () => {
    const customScheme = [
      { minPercent: 50, gradePoint: 4 },
      { minPercent: 0, gradePoint: 0 },
    ];
    expect(percentageToGradePoint(60, customScheme)).toBe(4);
    expect(percentageToGradePoint(20, customScheme)).toBe(0);
  });
});
