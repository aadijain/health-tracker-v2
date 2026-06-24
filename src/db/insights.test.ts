import { beforeEach, describe, expect, it } from "vitest";
import { emptyDb } from "./db";
import { setExercise } from "./exercise";
import { addFood, logProtein } from "./foods";
import { setGoal } from "./goals";
import {
  bpSeries,
  bpSummary,
  dailySeries,
  exerciseSummary,
  firstLogDate,
  heatmap,
  proteinSummary,
  streak,
  weightSummary,
} from "./insights";
import { upsertMeasurement } from "./measurements";
import type { Database } from "./types";

let db: Database;

beforeEach(() => {
  db = emptyDb();
  setGoal(db, "protein_g", "100");
  addFood(db, { name: "Unit", portion: "1", protein: 10 });
  // Protein: 50, 100, none, 30 grams across four days.
  logProtein(db, { date: "2026-06-01", food: "Unit", quantity: 5 });
  logProtein(db, { date: "2026-06-02", food: "Unit", quantity: 10 });
  logProtein(db, { date: "2026-06-04", food: "Unit", quantity: 3 });
  // Exercise: two on day 1, one on day 2.
  setExercise(db, "2026-06-01", "cardio", { done: true });
  setExercise(db, "2026-06-01", "meditation", { done: true });
  setExercise(db, "2026-06-02", "cardio", { done: true });
  // Measurements.
  upsertMeasurement(db, "2026-06-01", { weight: 70, systolic: 120, diastolic: 80 });
  upsertMeasurement(db, "2026-06-02", { systolic: 130, diastolic: 82 });
  upsertMeasurement(db, "2026-06-03", { weight: 72 });
});

describe("dailySeries", () => {
  it("fills gaps: protein with 0, weight with null, exercise counts", () => {
    expect(dailySeries(db, "protein", "2026-06-01", "2026-06-04").map((p) => p.value)).toEqual([
      50, 100, 0, 30,
    ]);
    expect(dailySeries(db, "weight", "2026-06-01", "2026-06-03").map((p) => p.value)).toEqual([
      70,
      null,
      72,
    ]);
    expect(dailySeries(db, "exercise", "2026-06-01", "2026-06-03").map((p) => p.value)).toEqual([
      2, 1, 0,
    ]);
  });

  it("bpSeries returns nullable triples per day", () => {
    const series = bpSeries(db, "2026-06-01", "2026-06-02");
    expect(series[0]).toEqual({ date: "2026-06-01", systolic: 120, diastolic: 80, pulse: null });
  });
});

describe("summaries", () => {
  it("protein: total, avg over logged days, daysMet at/above goal", () => {
    const s = proteinSummary(db, "2026-06-01", "2026-06-04");
    expect(s).toMatchObject({ total: 180, avg: 60, goal: 100, daysMet: 1, daysLogged: 3 });
  });

  it("exercise: counts, weeks, active days, per-exercise targets", () => {
    const s = exerciseSummary(db, "2026-06-01", "2026-06-03");
    expect(s).toMatchObject({ weeks: 1, totalDone: 3, daysActive: 2 });
    const cardio = s.perExercise.find((e) => e.key === "cardio");
    expect(cardio).toMatchObject({ count: 2, targetPerWeek: 5, target: 5 });
  });

  it("weight: avg, latest, change over logged days", () => {
    expect(weightSummary(db, "2026-06-01", "2026-06-03")).toMatchObject({
      avg: 71,
      latest: 72,
      change: 2,
      daysLogged: 2,
    });
  });

  it("bp: rounded averages over logged days", () => {
    expect(bpSummary(db, "2026-06-01", "2026-06-03")).toMatchObject({
      avgSystolic: 125,
      avgDiastolic: 81,
      daysLogged: 2,
    });
  });
});

describe("streak", () => {
  it("protein streak counts not-red days (>= orange %)", () => {
    // 50 and 100 are >= 45% of 100; 30 is red and breaks it.
    expect(streak(db, "protein", "2026-06-03")).toMatchObject({ current: 2, longest: 2 });
    // today (06-04) is red, and 06-03 had nothing, so current resets to 0.
    expect(streak(db, "protein", "2026-06-04").current).toBe(0);
  });

  it("exercise streak counts any active day", () => {
    expect(streak(db, "exercise", "2026-06-02")).toMatchObject({ current: 2, longest: 2 });
  });

  it("zero when no data", () => {
    expect(streak(emptyDb(), "protein", "2026-06-04")).toEqual({
      metric: "protein",
      current: 0,
      longest: 0,
    });
  });
});

describe("firstLogDate", () => {
  it("returns earliest date per metric, null when empty", () => {
    expect(firstLogDate(db, "protein")).toBe("2026-06-01");
    expect(firstLogDate(db, "exercise")).toBe("2026-06-01");
    expect(firstLogDate(db, "weight")).toBe("2026-06-01");
    expect(firstLogDate(emptyDb(), "protein")).toBeNull();
  });
});

describe("heatmap", () => {
  it("buckets protein into 0-4 levels and flags met", () => {
    const cells = heatmap(db, "protein", "2026-06-01", "2026-06-04").cells;
    expect(cells.map((c) => c.level)).toEqual([3, 4, 0, 2]);
    expect(cells.map((c) => c.met)).toEqual([false, true, false, false]);
  });
});
