/**
 * Lifecycle for the in-memory `Database`: create empty, seed defaults, and the
 * robust load/serialize pair used by the Drive sync layer.
 *
 * Loading never throws (robustness contract): a missing, empty, or unparseable
 * file yields an empty document, and individual malformed rows are skipped rather
 * than failing the whole load.
 */

import { DEFAULT_GOALS, SEED_FOODS } from "../config";
import type { Database, ExerciseEntry, Food, Measurement, ProteinEntry } from "./types";

export function emptyDb(): Database {
  return {
    foods: [],
    proteinLog: [],
    measurements: [],
    exerciseLog: [],
    goals: {},
  };
}

/** A fresh document populated with the seed foods and default goals. */
export function seedDb(): Database {
  const db = emptyDb();
  db.foods = SEED_FOODS.map((f, i) => ({
    id: i + 1,
    name: f.name,
    portion: f.portion,
    protein: f.protein,
  }));
  db.goals = { ...DEFAULT_GOALS };
  return db;
}

export function serializeDb(db: Database): string {
  return JSON.stringify(db);
}

/** Next free id for a table of `{ id }` rows (max + 1, starting at 1). */
export function nextId(rows: readonly { id: number }[]): number {
  return rows.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;
}

/** Parse a stored document, skipping anything malformed. Never throws. */
export function loadDb(text: string | null | undefined): Database {
  if (!text) {
    return emptyDb();
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return emptyDb();
  }
  if (!isObject(raw)) {
    return emptyDb();
  }

  return {
    foods: parseRows(raw.foods, parseFood),
    proteinLog: parseRows(raw.proteinLog, parseProteinEntry),
    measurements: parseRows(raw.measurements, parseMeasurement),
    exerciseLog: parseRows(raw.exerciseLog, parseExerciseEntry),
    goals: parseGoals(raw.goals),
  };
}

// --- Row parsers ---------------------------------------------------------

function parseRows<T>(value: unknown, parse: (row: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: T[] = [];
  for (const row of value) {
    if (!isObject(row)) {
      continue;
    }
    const parsed = parse(row);
    if (parsed !== null) {
      out.push(parsed);
    }
  }
  return out;
}

function parseFood(row: Record<string, unknown>): Food | null {
  const id = toId(row.id);
  const name = toStr(row.name).trim();
  if (id === null || name === "") {
    return null;
  }
  return { id, name, portion: toStr(row.portion), protein: toNum(row.protein) ?? 0 };
}

function parseProteinEntry(row: Record<string, unknown>): ProteinEntry | null {
  const id = toId(row.id);
  const date = toDate(row.date);
  if (id === null || date === null) {
    return null;
  }
  return {
    id,
    date,
    food: toStr(row.food),
    quantity: toNum(row.quantity) ?? 0,
    protein: toNum(row.protein) ?? 0,
  };
}

function parseMeasurement(row: Record<string, unknown>): Measurement | null {
  const date = toDate(row.date);
  if (date === null) {
    return null;
  }
  return {
    date,
    weight: toNum(row.weight),
    systolic: toNum(row.systolic),
    diastolic: toNum(row.diastolic),
    pulse: toNum(row.pulse),
  };
}

function parseExerciseEntry(row: Record<string, unknown>): ExerciseEntry | null {
  const date = toDate(row.date);
  const type = toStr(row.type).trim();
  if (date === null || type === "") {
    return null;
  }
  return { date, type, done: row.done === true, note: toStr(row.note) };
}

function parseGoals(value: unknown): Record<string, string> {
  if (!isObject(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "string") {
      out[key] = v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = String(v);
    }
  }
  return out;
}

// --- Coercion ------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A finite number, or null for anything else. */
function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** A positive integer id, or null. */
function toId(value: unknown): number | null {
  const n = toNum(value);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}

function toStr(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

/** A YYYY-MM-DD date string, or null. */
function toDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
