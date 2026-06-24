import { beforeEach, describe, expect, it } from "vitest";
import { getDay, goalMet, proteinZone } from "./day";
import { emptyDb } from "./db";
import { setExercise } from "./exercise";
import { addFood, logProtein } from "./foods";
import { setGoal } from "./goals";
import { upsertMeasurement } from "./measurements";
import type { Database } from "./types";

describe("proteinZone", () => {
  it("maps percent-of-goal to zones, null when no goal", () => {
    expect(proteinZone(0, 0)).toBeNull();
    expect(proteinZone(100, 0)).toBeNull();
    const goal = 100;
    expect(proteinZone(80, goal)).toBe("green");
    expect(proteinZone(79, goal)).toBe("yellow");
    expect(proteinZone(65, goal)).toBe("yellow");
    expect(proteinZone(64, goal)).toBe("orange");
    expect(proteinZone(45, goal)).toBe("orange");
    expect(proteinZone(44, goal)).toBe("red");
    expect(proteinZone(0, goal)).toBe("red");
  });
});

describe("getDay / goalMet", () => {
  let db: Database;
  const date = "2026-06-10";
  beforeEach(() => {
    db = emptyDb();
    setGoal(db, "protein_g", "100");
    addFood(db, { name: "Whey", portion: "1 scoop", protein: 25 });
  });

  it("sums protein, derives zone, and marks met at/above goal", () => {
    for (let i = 0; i < 4; i++) {
      logProtein(db, { date, food: "Whey", quantity: 1 });
    }
    const snap = getDay(db, date);
    expect(snap.protein.total).toBe(100);
    expect(snap.protein.goal).toBe(100);
    expect(snap.protein.zone).toBe("green");
    expect(snap.protein.met).toBe(true);
    expect(goalMet(db, "protein", date)).toBe(true);
  });

  it("protein not met below goal", () => {
    logProtein(db, { date, food: "Whey", quantity: 1 });
    expect(getDay(db, date).protein.met).toBe(false);
    expect(goalMet(db, "protein", date)).toBe(false);
  });

  it("exercise met when at least one is done", () => {
    expect(getDay(db, date).exercise.met).toBe(false);
    setExercise(db, date, "cardio", { done: true });
    const snap = getDay(db, date);
    expect(snap.exercise.doneCount).toBe(1);
    expect(snap.exercise.met).toBe(true);
    expect(goalMet(db, "exercise", date)).toBe(true);
  });

  it("includes measurement and returns false for unknown metrics", () => {
    upsertMeasurement(db, date, { weight: 70 });
    expect(getDay(db, date).measurement?.weight).toBe(70);
    expect(goalMet(db, "weight", date)).toBe(false);
  });
});
