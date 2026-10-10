'use client';

import { BookOpen, CalendarCheck, Flame, Plus, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { Reveal, RevealItem, Stagger } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { GlowCard } from '@/components/visual/GlowCard';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { Meter } from '@/components/viz/Meter';
import { StatTile } from '@/components/viz/StatTile';
import { StatusBadge } from '@/components/viz/StatusBadge';
import { useAttendanceSummary } from '@/modules/attendance/hooks/useAttendanceSummary';
import { formatPercentage, riskStatusLabel } from '@/modules/attendance/utils/display';
import { InsightsPanel } from '@/modules/ai/components/InsightsPanel';

export default function DashboardPage() {
  const summaryQuery = useAttendanceSummary();

  if (summaryQuery.isLoading) {
    return <LoadingBlock label="Loading your overview…" />;
  }
  if (summaryQuery.isError) {
    return <ErrorState onRetry={() => summaryQuery.refetch()} />;
  }

  const summary = summaryQuery.data;
  const subjects = summary?.subjects ?? [];

  if (subjects.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Add your first subject to start tracking attendance."
          action={
            <Button asChild>
              <Link href="/attendance">
                <Plus className="h-4 w-4" />
                Add your first subject
              </Link>
            </Button>
          }
        />
        <InsightsPanel />
      </div>
    );
  }

  // At-risk subjects surfaced first, everything else after.
  const sorted = [...subjects].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'AT_RISK' ? -1 : 1;
    return a.subjectName.localeCompare(b.subjectName);
  });

  // Counts only — no percentage or prediction math on the frontend (T9.15).
  // Every number below is read straight off the backend's summary.
  const atRiskCount = subjects.filter((s) => s.status === 'AT_RISK').length;
  const safeCount = subjects.length - atRiskCount;
  const overallPct = summary?.overall.percentage ?? null;

  return (
    <div className="space-y-5">
      {/* ---- Hero: the one number the dashboard leads with ---- */}
      <Reveal>
        <GlowCard gradientRing lift={false} className="overflow-hidden p-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Overall attendance
              </p>
              {/* Hero figure: ≥48px, system sans, proportional figures.
                  Exactly one per view. */}
              <p className="mt-1 text-6xl font-bold leading-none tracking-tight">
                <span className="text-gradient">
                  {/* Same precision the backend sent (2dp, trailing zeros
                      trimmed) — matches formatPercentage elsewhere on the
                      page and the AI summary directly below it. */}
                  <AnimatedNumber
                    value={overallPct}
                    format={(v) => `${Number(v.toFixed(2))}%`}
                  />
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {summary?.overall.attended ?? 0} of {summary?.overall.total ?? 0} classes attended
              </p>
            </div>

            <div className="w-full max-w-xs shrink-0">
              <Meter
                percentage={overallPct}
                tone="brand"
                label="Overall attendance"
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground">
                Across {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
              </p>
            </div>
          </div>
        </GlowCard>
      </Reveal>

      {/* ---- KPI row: a few headline numbers, as stat tiles ---- */}
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RevealItem>
          <StatTile
            label="Subjects"
            value={subjects.length}
            icon={BookOpen}
            hint="Being tracked"
            accent="hsl(var(--brand-violet))"
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label="On track"
            value={safeCount}
            icon={TrendingUp}
            hint="Above cutoff"
            accent="var(--status-good)"
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label="At risk"
            value={atRiskCount}
            icon={Flame}
            hint="Below cutoff"
            accent="var(--status-critical)"
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label="Classes attended"
            value={summary?.overall.attended ?? 0}
            icon={CalendarCheck}
            hint={`of ${summary?.overall.total ?? 0} held`}
            accent="hsl(var(--brand-cyan))"
          />
        </RevealItem>
      </Stagger>

      {/* ---- AI insights ---- */}
      <Reveal delay={0.08}>
        <InsightsPanel />
      </Reveal>

      {/* ---- Per-subject meters ---- */}
      <Stagger className="space-y-3">
        <RevealItem>
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">Your subjects</h2>
        </RevealItem>

        {sorted.map((s) => {
          const atRisk = s.status === 'AT_RISK';
          return (
            <RevealItem key={s.subjectId}>
              <Link href={`/attendance/${s.subjectId}`} className="block">
                <GlowCard className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{s.subjectName}</span>
                      <span className="text-xs text-muted-foreground">{s.subjectCode}</span>
                      {/* Icon + label, never color alone — good/critical is a
                          red/green pair that CVD readers can't separate. */}
                      <StatusBadge
                        tone={atRisk ? 'critical' : 'good'}
                        label={riskStatusLabel(s.status)}
                      />
                    </div>
                    <span className="shrink-0 text-lg font-semibold tabular">
                      {formatPercentage(s.percentage)}
                    </span>
                  </div>

                  <Meter
                    percentage={s.percentage}
                    tone={atRisk ? 'critical' : 'good'}
                    cutoff={s.minAttendancePercent}
                    label={`${s.subjectName} attendance`}
                    height="sm"
                    className="mt-3"
                  />

                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {atRisk
                        ? `Must attend next ${s.mustAttend} to recover`
                        : `Can miss ${s.canMiss} more`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" aria-hidden="true" />
                      cutoff {s.minAttendancePercent}%
                    </span>
                  </div>
                </GlowCard>
              </Link>
            </RevealItem>
          );
        })}
      </Stagger>

      <Reveal delay={0.12}>
        <Button asChild variant="outline" className="w-full">
          <Link href="/attendance">Mark today&apos;s attendance</Link>
        </Button>
      </Reveal>
    </div>
  );
}
