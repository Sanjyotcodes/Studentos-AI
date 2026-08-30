// T14.6: rounding follows one documented rule, applied in exactly one place.
// Enforced as a real, running test rather than a one-time manual read, so a
// later change can't silently reintroduce a second rounding rule (e.g. a
// hand-rolled `.toFixed()` or a second `Math.round` call elsewhere in the
// aggregation path) — same pattern as ai.static.test.ts's T10.1.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SERVICE_PATH = join(__dirname, 'grades.service.ts');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('T14.6: rounding is applied in exactly one place (roundTo2)', () => {
  it('grades.service.ts contains exactly one Math.round call, inside roundTo2', () => {
    const src = stripComments(readFileSync(SERVICE_PATH, 'utf-8'));

    const roundMatches = src.match(/Math\.round/g) ?? [];
    expect(roundMatches).toHaveLength(1);

    // The single Math.round call must be the one inside roundTo2's body —
    // not some other function that happens to also round.
    const roundTo2Body = src.match(/export function roundTo2\([^)]*\)[^{]*\{([\s\S]*?)\n\}/);
    expect(roundTo2Body).not.toBeNull();
    expect(roundTo2Body![1]).toContain('Math.round');

    // No alternative rounding mechanisms sneaking in elsewhere (toFixed
    // truncates/rounds differently and would be a second, undocumented rule).
    expect(src).not.toMatch(/\.toFixed\(/);
  });

  it('every percentage/GPA-producing function routes through roundTo2 rather than rounding inline', () => {
    const src = stripComments(readFileSync(SERVICE_PATH, 'utf-8'));
    const computeWeightedPercentageBody = src.match(
      /export function computeWeightedPercentage\([^)]*\)[^{]*\{([\s\S]*?)\n\}/,
    );
    const computeGpaBody = src.match(/export function computeGpa\([^)]*\)[^{]*\{([\s\S]*?)\n\}/);

    expect(computeWeightedPercentageBody).not.toBeNull();
    expect(computeGpaBody).not.toBeNull();
    expect(computeWeightedPercentageBody![1]).toContain('roundTo2(');
    expect(computeGpaBody![1]).toContain('roundTo2(');
  });
});
