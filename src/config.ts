/**
 * Central configuration for the Health Tracker.
 *
 * Everything that defines *what* is tracked lives here so it can be tuned in one
 * place. The `METRICS` registry is the single source of truth for the data layer
 * and the UI; edit these constants rather than scattering values across modules.
 */

// --- Types ---------------------------------------------------------------

export interface Exercise {
  /** Stable identifier used as the storage key. */
  key: string;
  /** Human-readable name shown in the UI. */
  label: string;
  /** Whether this exercise carries a free-text note (only Bonus Activity does). */
  note: boolean;
}

/** How a metric is rendered and aggregated. */
export type MetricKind = "scalar" | "composite" | "sum" | "checklist";

export interface Metric {
  key: string;
  label: string;
  kind: MetricKind;
  /** True when the metric has a goal the user can meet for the day. */
  goal: boolean;
  unit?: string;
  /** `scalar`: the single measurement column. */
  field?: string;
  /** `composite`: the set of measurement columns. */
  fields?: readonly string[];
  /** `sum`: the goals key holding the daily target. */
  goalKey?: string;
  /** `checklist`: the items that can be ticked off each day. */
  items?: readonly Exercise[];
}

export interface SeedFood {
  name: string;
  /** Household portion the protein figure refers to, e.g. "1 cup". */
  portion: string;
  /** Grams of protein per portion. */
  protein: number;
}

// --- Branding ------------------------------------------------------------

export const APP_NAME = "Health Tracker";
export const PRIMARY_COLOR = "#4f46e5";

// --- Exercises -----------------------------------------------------------

// Each exercise is a plain done/not-done checkbox for the day. Targets are
// weekly (days done per week), stored under `<key>_per_week` and editable in
// Settings. `note: true` marks the one exercise that also carries a free-text note.
export const EXERCISES: readonly Exercise[] = [
  { key: "cardio", label: "Cardio", note: false },
  { key: "foot_morning", label: "Foot Stretching (morning)", note: false },
  { key: "foot_evening", label: "Foot Stretching (evening)", note: false },
  { key: "meditation", label: "Meditation", note: false },
  { key: "strength", label: "Strength Training", note: false },
  { key: "bonus", label: "Bonus Activity", note: true },
];

export const EXERCISE_KEYS: readonly string[] = EXERCISES.map((e) => e.key);
export const EXERCISE_BY_KEY: ReadonlyMap<string, Exercise> = new Map(
  EXERCISES.map((e) => [e.key, e]),
);

/** Goal key holding an exercise's weekly target (days done per week). */
export function exerciseGoalKey(key: string): string {
  return `${key}_per_week`;
}

// --- Metrics -------------------------------------------------------------

// `kind` tells the UI how to render a metric and the data layer how to aggregate it:
//   scalar    - one number per day (weight)
//   composite - several named fields per day (blood pressure)
//   sum       - summed from a log table (protein, from foods x quantity)
//   checklist - a set of done items per day (exercise)
export const METRICS: readonly Metric[] = [
  { key: "weight", label: "Weight", kind: "scalar", unit: "kg", field: "weight", goal: false },
  {
    key: "bp",
    label: "BP",
    kind: "composite",
    fields: ["systolic", "diastolic", "pulse"],
    goal: false,
  },
  { key: "protein", label: "Protein", kind: "sum", unit: "g", goal: true, goalKey: "protein_g" },
  { key: "exercise", label: "Exercise", kind: "checklist", items: EXERCISES, goal: true },
];

export const METRIC_BY_KEY: ReadonlyMap<string, Metric> = new Map(METRICS.map((m) => [m.key, m]));
export const GOAL_METRICS: readonly string[] = METRICS.filter((m) => m.goal).map((m) => m.key);

// --- Protein zones -------------------------------------------------------

// How close a day's protein is to its target, as percent-of-goal breakpoints:
// below `orange` is red, then orange, yellow, and green at or above `green`.
// Fixed configuration (not user-editable); retune here.
export const PROTEIN_ZONES = { orange: 45, yellow: 65, green: 80 } as const;

export type ProteinZone = "red" | "orange" | "yellow" | "green";

// --- Default goals -------------------------------------------------------

// Seed values for the goals store. Protein has a daily target; exercises have
// weekly targets (days done per week). Edited in Settings.
export const DEFAULT_GOALS: Readonly<Record<string, string>> = {
  protein_g: "84",
  cardio_per_week: "5",
  foot_morning_per_week: "5",
  foot_evening_per_week: "5",
  meditation_per_week: "4",
  strength_per_week: "3",
  bonus_per_week: "4",
};

// --- Seed foods ----------------------------------------------------------

// Vegetarian protein sources used only to populate an empty food database; edit
// foods in the app or via CSV afterwards.
export const SEED_FOODS: readonly SeedFood[] = [
  // Legumes, lentils & chana
  { name: "Dal Makhani", portion: "1 cup", protein: 12 },
  { name: "Moong Dal", portion: "1 cup", protein: 14 },
  { name: "Masoor Dal", portion: "1 cup", protein: 18 },
  { name: "Toor Dal", portion: "1 cup", protein: 12 },
  { name: "Chana Dal", portion: "1 cup", protein: 12 },
  { name: "Rajma", portion: "1 cup", protein: 14 },
  { name: "Chole", portion: "1 cup", protein: 13 },
  { name: "Sambar", portion: "1 cup", protein: 7 },
  { name: "Black Chana (Kala Chana)", portion: "1 cup", protein: 15 },
  { name: "Sprouted Chana", portion: "1 cup", protein: 13 },
  { name: "Roasted Chana", portion: "1/4 cup", protein: 7 },
  { name: "Green Peas", portion: "1 cup", protein: 8 },
  { name: "Hummus", portion: "1/4 cup", protein: 5 },
  { name: "Falafel", portion: "4 piece", protein: 13 },
  { name: "Edamame", portion: "1 cup", protein: 17 },
  // Soya & tofu
  { name: "Tofu", portion: "100 g", protein: 8 },
  { name: "Soya Chunks", portion: "1 cup", protein: 24 },
  // Paneer & cheese
  { name: "Paneer (cubes)", portion: "100 g", protein: 18 },
  { name: "Paneer Sabji", portion: "1 cup", protein: 14 },
  // Dairy
  { name: "Milk", portion: "1 glass", protein: 8 },
  { name: "Curd / Yogurt", portion: "1 cup", protein: 6 },
  { name: "Greek Yogurt", portion: "1 cup", protein: 17 },
  { name: "Lassi (sweet)", portion: "1 glass", protein: 8 },
  { name: "Buttermilk (Chaas)", portion: "1 glass", protein: 3 },
  // Nuts & seeds
  { name: "Peanuts", portion: "1/4 cup", protein: 9 },
  { name: "Almonds", portion: "10 piece", protein: 3 },
  { name: "Cashews", portion: "1/4 cup", protein: 5 },
  { name: "Mixed Nuts", portion: "1/4 cup", protein: 7 },
  { name: "Watermelon Seeds", portion: "1/4 cup", protein: 8 },
  { name: "Sesame Seeds", portion: "1 tbsp", protein: 2 },
  { name: "Chia Seeds", portion: "1 tbsp", protein: 2 },
  { name: "Peanut Butter", portion: "1 tbsp", protein: 4 },
  // Grains & breakfast
  { name: "Besan Chilla", portion: "1 piece", protein: 7 },
  { name: "Quinoa", portion: "1 cup", protein: 8 },
  { name: "Oats", portion: "1 cup", protein: 6 },
  { name: "Roti", portion: "1 piece", protein: 3 },
  { name: "White Rice", portion: "1 cup", protein: 4 },
  // Snacks & supplements
  { name: "Chikki", portion: "1 piece", protein: 5 },
  { name: "Protein Shake (Whey)", portion: "1 scoop", protein: 24 },
];

// --- CSV tables ----------------------------------------------------------

// Tables that can be imported/exported as CSV, with their column order.
export const CSV_TABLES: Readonly<Record<string, readonly string[]>> = {
  foods: ["name", "portion", "protein"],
  protein_log: ["id", "date", "food", "quantity", "protein"],
  measurements: ["date", "weight", "systolic", "diastolic", "pulse"],
  exercise_log: ["date", "type", "done", "note"],
  goals: ["key", "value"],
};

// --- Storage -------------------------------------------------------------

// Name of the SQLite database file kept in the user's private Drive app folder.
export const DRIVE_DB_FILENAME = "health-tracker.db";

// OAuth scope: a per-app, per-user hidden folder. The app can only see files it
// creates, and the data never leaves the user's own Drive.
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

// Google OAuth client ID is supplied at build time and is safe to expose.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
