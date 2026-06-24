/**
 * The in-memory data document.
 *
 * Everything the app persists lives on a single plain-JSON `Database` object,
 * serialized whole and synced to the user's Drive. The shapes mirror v1's SQLite
 * tables; constraints SQLite used to enforce (unique names, one row per date,
 * upserts) are upheld by the write helpers in the per-feature modules.
 */

export interface Food {
  id: number;
  name: string;
  /** Household portion the protein figure refers to, e.g. "1 cup". */
  portion: string;
  /** Grams of protein per portion. */
  protein: number;
}

export interface ProteinEntry {
  id: number;
  /** ISO date (YYYY-MM-DD) the food was logged on. */
  date: string;
  /** Food name, snapshotted so renaming/deleting a food never rewrites history. */
  food: string;
  /** Number of portions logged. */
  quantity: number;
  /** Protein for this entry (food protein x quantity), snapshotted at log time. */
  protein: number;
}

export interface Measurement {
  /** ISO date (YYYY-MM-DD); one row per day. */
  date: string;
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
}

export interface ExerciseEntry {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Exercise key (see `EXERCISES` in config). */
  type: string;
  done: boolean;
  /** Free-text note; only the Bonus Activity uses it. Empty string when none. */
  note: string;
}

export interface Database {
  foods: Food[];
  proteinLog: ProteinEntry[];
  /** One entry per date. */
  measurements: Measurement[];
  /** One entry per (date, type). */
  exerciseLog: ExerciseEntry[];
  /** `protein_g` plus a `<exercise>_per_week` per exercise. Values are strings. */
  goals: Record<string, string>;
}
