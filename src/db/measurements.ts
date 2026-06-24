/**
 * Daily body measurements: weight and blood pressure (systolic/diastolic/pulse).
 * One row per date; writing upserts and merges only the fields provided.
 */

import type { Database, Measurement } from "./types";

export type MeasurementFields = Omit<Measurement, "date">;

export function getMeasurement(db: Database, date: string): Measurement | null {
  return db.measurements.find((m) => m.date === date) ?? null;
}

/**
 * Insert or update the measurement for a date, overwriting only the fields given.
 * `null` explicitly clears a field; omitted fields are left untouched.
 */
export function upsertMeasurement(
  db: Database,
  date: string,
  fields: Partial<MeasurementFields>,
): Measurement {
  let row = db.measurements.find((m) => m.date === date);
  if (!row) {
    row = { date, weight: null, systolic: null, diastolic: null, pulse: null };
    db.measurements.push(row);
  }
  if (fields.weight !== undefined) {
    row.weight = fields.weight;
  }
  if (fields.systolic !== undefined) {
    row.systolic = fields.systolic;
  }
  if (fields.diastolic !== undefined) {
    row.diastolic = fields.diastolic;
  }
  if (fields.pulse !== undefined) {
    row.pulse = fields.pulse;
  }
  return row;
}
