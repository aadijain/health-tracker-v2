/**
 * Aggregations for the Trends and Activity screens: per-day series, calendar
 * period summaries (a week is Monday-Sunday, not a trailing window), streaks
 * with the relaxed rules, and a GitHub-style heatmap. Ported from v1.
 */

import { EXERCISES, EXERCISE_KEYS, PROTEIN_ZONES } from "../config";
import { addDays, dateRange, todayStr } from "./dates";
import { exerciseTargets, proteinGoal } from "./goals";
import type { Database } from "./types";

export interface ValuePoint {
  date: string;
  value: number | null;
}

export interface BpPoint {
  date: string;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
}

export type NumericMetric = "protein" | "weight" | "exercise";

// --- Raw per-date lookups ------------------------------------------------

function proteinByDate(db: Database): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of db.proteinLog) {
    out.set(e.date, round1((out.get(e.date) ?? 0) + e.protein));
  }
  return out;
}

function exerciseDoneByDate(db: Database): Map<string, number> {
  const out = new Map<string, number>();
  const keys = new Set(EXERCISE_KEYS);
  for (const e of db.exerciseLog) {
    if (e.done && keys.has(e.type)) {
      out.set(e.date, (out.get(e.date) ?? 0) + 1);
    }
  }
  return out;
}

function measurementByDate(db: Database): Map<string, (typeof db.measurements)[number]> {
  return new Map(db.measurements.map((m) => [m.date, m]));
}

// --- Series --------------------------------------------------------------

/** Per-day values for a numeric metric across [start, end], filling missing days. */
export function dailySeries(
  db: Database,
  metric: NumericMetric,
  start: string,
  end: string,
): ValuePoint[] {
  const days = dateRange(start, end);
  if (metric === "protein") {
    const data = proteinByDate(db);
    return days.map((d) => ({ date: d, value: data.get(d) ?? 0 }));
  }
  if (metric === "exercise") {
    const data = exerciseDoneByDate(db);
    return days.map((d) => ({ date: d, value: data.get(d) ?? 0 }));
  }
  const m = measurementByDate(db);
  return days.map((d) => ({ date: d, value: m.get(d)?.weight ?? null }));
}

export function bpSeries(db: Database, start: string, end: string): BpPoint[] {
  const m = measurementByDate(db);
  return dateRange(start, end).map((d) => {
    const row = m.get(d);
    return {
      date: d,
      systolic: row?.systolic ?? null,
      diastolic: row?.diastolic ?? null,
      pulse: row?.pulse ?? null,
    };
  });
}

// --- Summaries -----------------------------------------------------------

interface SummaryBase {
  start: string;
  end: string;
  days: number;
}

export interface ProteinSummary extends SummaryBase {
  metric: "protein";
  total: number;
  avg: number;
  goal: number;
  daysMet: number;
  daysLogged: number;
}

export interface ExercisePerType {
  key: string;
  label: string;
  count: number;
  targetPerWeek: number;
  target: number;
}

export interface ExerciseSummary extends SummaryBase {
  metric: "exercise";
  weeks: number;
  totalDone: number;
  daysActive: number;
  perExercise: ExercisePerType[];
}

export interface WeightSummary extends SummaryBase {
  metric: "weight";
  avg: number | null;
  latest: number | null;
  change: number | null;
  daysLogged: number;
}

export interface BpSummary extends SummaryBase {
  metric: "bp";
  avgSystolic: number | null;
  avgDiastolic: number | null;
  daysLogged: number;
}

export function proteinSummary(db: Database, start: string, end: string): ProteinSummary {
  const series = dailySeries(db, "protein", start, end);
  const vals = series.map((r) => r.value ?? 0);
  const goal = proteinGoal(db);
  const logged = vals.filter((v) => v > 0);
  return {
    metric: "protein",
    start,
    end,
    days: series.length,
    total: round1(sum(vals)),
    avg: logged.length ? round1(sum(logged) / logged.length) : 0,
    goal,
    daysMet: vals.filter((v) => goal > 0 && v >= goal).length,
    daysLogged: logged.length,
  };
}

export function exerciseSummary(db: Database, start: string, end: string): ExerciseSummary {
  const series = dailySeries(db, "exercise", start, end);
  const counts = exerciseCountsByType(db, start, end);
  const targets = exerciseTargets(db);
  const days = series.length;
  const weeks = days ? Math.max(1, Math.round(days / 7)) : 1;
  const perExercise = EXERCISES.map((ex) => {
    const targetPerWeek = targets[ex.key] ?? 0;
    return {
      key: ex.key,
      label: ex.label,
      count: counts.get(ex.key) ?? 0,
      targetPerWeek,
      target: targetPerWeek * weeks,
    };
  });
  return {
    metric: "exercise",
    start,
    end,
    days,
    weeks,
    totalDone: sum(series.map((r) => r.value ?? 0)),
    daysActive: series.filter((r) => (r.value ?? 0) >= 1).length,
    perExercise,
  };
}

export function weightSummary(db: Database, start: string, end: string): WeightSummary {
  const vals = dailySeries(db, "weight", start, end)
    .map((r) => r.value)
    .filter((v): v is number => v !== null);
  return {
    metric: "weight",
    start,
    end,
    days: dateRange(start, end).length,
    avg: vals.length ? round1(sum(vals) / vals.length) : null,
    latest: vals.length ? vals[vals.length - 1] : null,
    change: vals.length >= 2 ? round1(vals[vals.length - 1] - vals[0]) : null,
    daysLogged: vals.length,
  };
}

export function bpSummary(db: Database, start: string, end: string): BpSummary {
  const series = bpSeries(db, start, end);
  const sysv = series.map((r) => r.systolic).filter((v): v is number => v !== null);
  const diav = series.map((r) => r.diastolic).filter((v): v is number => v !== null);
  return {
    metric: "bp",
    start,
    end,
    days: series.length,
    avgSystolic: sysv.length ? Math.round(sum(sysv) / sysv.length) : null,
    avgDiastolic: diav.length ? Math.round(sum(diav) / diav.length) : null,
    daysLogged: sysv.length,
  };
}

function exerciseCountsByType(db: Database, start: string, end: string): Map<string, number> {
  const keys = new Set(EXERCISE_KEYS);
  const out = new Map<string, number>();
  for (const e of db.exerciseLog) {
    if (e.done && keys.has(e.type) && e.date >= start && e.date <= end) {
      out.set(e.type, (out.get(e.type) ?? 0) + 1);
    }
  }
  return out;
}

// --- Streaks -------------------------------------------------------------

export interface StreakResult {
  metric: string;
  current: number;
  longest: number;
}

/** Dates where the goal metric counts toward its (relaxed) streak. */
function metDates(db: Database, metric: string): Set<string> {
  if (metric === "protein") {
    const goal = proteinGoal(db);
    if (!(goal > 0)) {
      return new Set();
    }
    // Not "red": at or above the orange breakpoint of the target.
    const thresh = (goal * PROTEIN_ZONES.orange) / 100;
    const out = new Set<string>();
    for (const [d, v] of proteinByDate(db)) {
      if (v >= thresh) {
        out.add(d);
      }
    }
    return out;
  }
  if (metric === "exercise") {
    const out = new Set<string>();
    for (const [d, count] of exerciseDoneByDate(db)) {
      if (count >= 1) {
        out.add(d);
      }
    }
    return out;
  }
  return new Set();
}

/** Current and longest run of consecutive streak-met days for a metric. */
export function streak(db: Database, metric: string, today: string = todayStr()): StreakResult {
  const met = metDates(db, metric);
  if (met.size === 0) {
    return { metric, current: 0, longest: 0 };
  }

  // Count back from today; if today isn't met yet, start at yesterday so an
  // in-progress day doesn't read as a broken streak.
  let current = 0;
  let cursor = met.has(today) ? today : addDays(today, -1);
  while (met.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...met].sort()) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { metric, current, longest };
}

// --- Heatmap -------------------------------------------------------------

/** Earliest date any data exists for a metric, or null if there is none. */
export function firstLogDate(db: Database, metric: string): string | null {
  const dates =
    metric === "protein"
      ? db.proteinLog.map((e) => e.date)
      : metric === "exercise"
        ? db.exerciseLog.map((e) => e.date)
        : db.measurements.map((m) => m.date);
  return dates.length ? dates.reduce((min, d) => (d < min ? d : min)) : null;
}

export interface HeatmapCell {
  date: string;
  value: number;
  /** 0-4 intensity bucket. */
  level: number;
  met: boolean;
}

export interface Heatmap {
  metric: string;
  start: string;
  end: string;
  cells: HeatmapCell[];
}

/** 0-4 intensity bucket for a value relative to a target. */
function levelFor(value: number, target: number): number {
  if (!value) {
    return 0;
  }
  if (target > 0) {
    const frac = value / target;
    if (frac >= 1) {
      return 4;
    }
    return Math.max(1, Math.min(3, Math.floor(frac * 4) + 1));
  }
  return 1;
}

export function heatmap(db: Database, metric: string, start: string, end: string): Heatmap {
  let cells: HeatmapCell[];
  if (metric === "protein") {
    const target = proteinGoal(db);
    cells = dailySeries(db, "protein", start, end).map((r) => {
      const v = r.value ?? 0;
      return { date: r.date, value: v, level: levelFor(v, target), met: target > 0 && v >= target };
    });
  } else if (metric === "exercise") {
    const target = EXERCISES.length;
    cells = dailySeries(db, "exercise", start, end).map((r) => {
      const v = r.value ?? 0;
      return { date: r.date, value: v, level: levelFor(v, target), met: v >= 1 };
    });
  } else {
    const series = dailySeries(db, "weight", start, end);
    const vals = series.map((r) => r.value ?? 0).filter((v) => v > 0);
    const mx = vals.length ? Math.max(...vals) : 0;
    cells = series.map((r) => {
      const v = r.value ?? 0;
      return { date: r.date, value: v, level: levelFor(v, mx), met: false };
    });
  }
  return { metric, start, end, cells };
}

// --- Internal ------------------------------------------------------------

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
