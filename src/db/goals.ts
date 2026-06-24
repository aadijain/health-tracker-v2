/**
 * The goals store: a flat map of string-valued settings (`protein_g` and one
 * `<exercise>_per_week` per exercise). Reads fall back to the defaults so a
 * missing key behaves as if the default were set.
 */

import { DEFAULT_GOALS, EXERCISE_KEYS, exerciseGoalKey } from "../config";
import type { Database } from "./types";

export function getGoals(db: Database): Record<string, string> {
  return { ...DEFAULT_GOALS, ...db.goals };
}

export function getGoal(db: Database, key: string): string | undefined {
  return db.goals[key] ?? DEFAULT_GOALS[key];
}

export function setGoal(db: Database, key: string, value: string): void {
  db.goals[key] = value;
}

/** The daily protein target in grams (0 if unset/invalid). */
export function proteinGoal(db: Database): number {
  return toNumber(getGoal(db, "protein_g"));
}

/** Map of exercise key -> weekly target (days done per week). */
export function exerciseTargets(db: Database): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of EXERCISE_KEYS) {
    out[key] = toNumber(getGoal(db, exerciseGoalKey(key)));
  }
  return out;
}

function toNumber(value: string | undefined): number {
  if (value === undefined) {
    return 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
