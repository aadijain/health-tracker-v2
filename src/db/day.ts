/**
 * Per-day snapshot combining every metric with its goal progress, plus the
 * protein-zone helper. Mirrors v1's `get_day`/`goal_met`/`protein_zone`.
 */

import { EXERCISES, PROTEIN_ZONES, type ProteinZone } from "../config";
import { getExercises } from "./exercise";
import type { DayExercise } from "./exercise";
import { proteinEntries } from "./foods";
import { proteinGoal } from "./goals";
import { getMeasurement } from "./measurements";
import type { Database, Measurement, ProteinEntry } from "./types";

export interface DaySnapshot {
  date: string;
  measurement: Measurement | null;
  protein: {
    entries: ProteinEntry[];
    total: number;
    goal: number;
    zone: ProteinZone | null;
    /** The full daily goal was reached. */
    met: boolean;
  };
  exercise: {
    items: DayExercise[];
    doneCount: number;
    total: number;
    /** The day counts toward the exercise streak if anything was done. */
    met: boolean;
  };
}

/** Zone name for a day's protein vs its target, or null when there is no goal. */
export function proteinZone(total: number, goal: number): ProteinZone | null {
  if (!(goal > 0)) {
    return null;
  }
  const pct = (total / goal) * 100;
  if (pct >= PROTEIN_ZONES.green) {
    return "green";
  }
  if (pct >= PROTEIN_ZONES.yellow) {
    return "yellow";
  }
  if (pct >= PROTEIN_ZONES.orange) {
    return "orange";
  }
  return "red";
}

export function getDay(db: Database, date: string): DaySnapshot {
  const entries = proteinEntries(db, date);
  const total = round1(entries.reduce((sum, e) => sum + e.protein, 0));
  const goal = proteinGoal(db);
  const items = getExercises(db, date);
  const doneCount = items.reduce((n, e) => n + (e.done ? 1 : 0), 0);

  return {
    date,
    measurement: getMeasurement(db, date),
    protein: {
      entries,
      total,
      goal,
      zone: proteinZone(total, goal),
      met: goal > 0 && total >= goal,
    },
    exercise: {
      items,
      doneCount,
      total: EXERCISES.length,
      met: doneCount >= 1,
    },
  };
}

/** Whether a goal metric's daily goal was met (false for non-goal metrics). */
export function goalMet(db: Database, metric: string, date: string): boolean {
  const snap = getDay(db, date);
  if (metric === "protein") {
    return snap.protein.met;
  }
  if (metric === "exercise") {
    return snap.exercise.met;
  }
  return false;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
