import { beforeEach, describe, expect, it } from "vitest";
import { EXERCISES } from "../config";
import { emptyDb } from "./db";
import { getExercises, setExercise } from "./exercise";
import { exerciseTargets, getGoal, getGoals, proteinGoal, setGoal } from "./goals";
import { getMeasurement, upsertMeasurement } from "./measurements";
import type { Database } from "./types";

let db: Database;
beforeEach(() => {
  db = emptyDb();
});

describe("measurements", () => {
  it("upserts and merges only provided fields, null clears", () => {
    upsertMeasurement(db, "2026-06-01", { weight: 70, systolic: 120 });
    upsertMeasurement(db, "2026-06-01", { systolic: 118 });
    const m = getMeasurement(db, "2026-06-01");
    expect(m).toMatchObject({ weight: 70, systolic: 118, diastolic: null });
    expect(db.measurements).toHaveLength(1);
    upsertMeasurement(db, "2026-06-01", { weight: null });
    expect(getMeasurement(db, "2026-06-01")?.weight).toBeNull();
  });

  it("returns null for an unrecorded date", () => {
    expect(getMeasurement(db, "2026-01-01")).toBeNull();
  });
});

describe("goals", () => {
  it("reads fall back to defaults, writes override", () => {
    expect(getGoal(db, "protein_g")).toBe("84");
    setGoal(db, "protein_g", "100");
    expect(getGoal(db, "protein_g")).toBe("100");
    expect(proteinGoal(db)).toBe(100);
    expect(getGoals(db).protein_g).toBe("100");
  });

  it("exerciseTargets covers every exercise key as a number", () => {
    const targets = exerciseTargets(db);
    expect(Object.keys(targets).sort()).toEqual(EXERCISES.map((e) => e.key).sort());
    for (const v of Object.values(targets)) {
      expect(typeof v).toBe("number");
    }
  });
});

describe("exercise checklist", () => {
  it("returns every exercise in config order, defaulting to not done", () => {
    const items = getExercises(db, "2026-06-01");
    expect(items.map((i) => i.key)).toEqual(EXERCISES.map((e) => e.key));
    expect(items.every((i) => !i.done && i.note === "")).toBe(true);
    expect(items.find((i) => i.key === "bonus")?.carriesNote).toBe(true);
  });

  it("upserts done and note per (date, type)", () => {
    setExercise(db, "2026-06-01", "bonus", { done: true, note: "swim" });
    setExercise(db, "2026-06-01", "bonus", { done: false });
    expect(db.exerciseLog).toHaveLength(1);
    const bonus = getExercises(db, "2026-06-01").find((i) => i.key === "bonus");
    expect(bonus).toMatchObject({ done: false, note: "swim" });
  });
});
