/**
 * The daily exercise checklist. Each configured exercise is done/not-done for a
 * day; the Bonus Activity also carries a free-text note. One row per (date, type);
 * writing upserts.
 */

import { EXERCISES } from "../config";
import type { Database, ExerciseEntry } from "./types";

export interface DayExercise {
  key: string;
  label: string;
  /** Whether this exercise carries a free-text note (only Bonus Activity does). */
  carriesNote: boolean;
  done: boolean;
  /** Free-text note; empty string when none. */
  note: string;
}

/** The full checklist for a day, in config order, merged with what was logged. */
export function getExercises(db: Database, date: string): DayExercise[] {
  return EXERCISES.map((ex) => {
    const entry = db.exerciseLog.find((e) => e.date === date && e.type === ex.key);
    return {
      key: ex.key,
      label: ex.label,
      carriesNote: ex.note,
      done: entry?.done ?? false,
      note: entry?.note ?? "",
    };
  });
}

export function setExercise(
  db: Database,
  date: string,
  type: string,
  fields: { done?: boolean; note?: string },
): ExerciseEntry {
  let row = db.exerciseLog.find((e) => e.date === date && e.type === type);
  if (!row) {
    row = { date, type, done: false, note: "" };
    db.exerciseLog.push(row);
  }
  if (fields.done !== undefined) {
    row.done = fields.done;
  }
  if (fields.note !== undefined) {
    row.note = fields.note;
  }
  return row;
}
