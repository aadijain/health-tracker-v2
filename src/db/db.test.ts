import { describe, expect, it } from "vitest";
import { DEFAULT_GOALS, SEED_FOODS } from "../config";
import { emptyDb, loadDb, nextId, seedDb, serializeDb } from "./db";

describe("emptyDb / seedDb", () => {
  it("emptyDb has empty tables", () => {
    const db = emptyDb();
    expect(db.foods).toEqual([]);
    expect(db.proteinLog).toEqual([]);
    expect(db.measurements).toEqual([]);
    expect(db.exerciseLog).toEqual([]);
    expect(db.goals).toEqual({});
  });

  it("seedDb populates foods (with ids) and default goals", () => {
    const db = seedDb();
    expect(db.foods).toHaveLength(SEED_FOODS.length);
    expect(db.foods[0]).toMatchObject({ id: 1, name: SEED_FOODS[0].name });
    expect(new Set(db.foods.map((f) => f.id)).size).toBe(db.foods.length);
    expect(db.goals).toEqual({ ...DEFAULT_GOALS });
  });
});

describe("loadDb (robust)", () => {
  it("returns empty for null/empty/garbage", () => {
    expect(loadDb(null)).toEqual(emptyDb());
    expect(loadDb("")).toEqual(emptyDb());
    expect(loadDb("not json")).toEqual(emptyDb());
    expect(loadDb("[]")).toEqual(emptyDb());
    expect(loadDb("42")).toEqual(emptyDb());
  });

  it("round-trips a seeded document", () => {
    const db = seedDb();
    expect(loadDb(serializeDb(db))).toEqual(db);
  });

  it("skips malformed rows but keeps valid ones", () => {
    const text = JSON.stringify({
      foods: [
        { id: 1, name: "Milk", portion: "1 glass", protein: 8 },
        { id: 0, name: "BadId" },
        { id: 2, name: "" },
        "nonsense",
        { id: 3, name: "Tofu", portion: "100 g", protein: "8" },
      ],
      proteinLog: [{ id: 1, date: "2026-06-01", food: "Milk", quantity: 1, protein: 8 }],
      measurements: [{ date: "2026-06-01", weight: 70 }, { date: "bad" }],
      exerciseLog: [{ date: "2026-06-01", type: "cardio", done: true }],
      goals: { protein_g: "84", junk: 5, bad: { x: 1 } },
    });
    const db = loadDb(text);
    expect(db.foods.map((f) => f.name)).toEqual(["Milk", "Tofu"]);
    expect(db.foods[1].protein).toBe(8); // coerced from "8"
    expect(db.measurements).toEqual([
      { date: "2026-06-01", weight: 70, systolic: null, diastolic: null, pulse: null },
    ]);
    expect(db.exerciseLog[0]).toMatchObject({ done: true, note: "" });
    expect(db.goals).toEqual({ protein_g: "84", junk: "5" });
  });
});

describe("nextId", () => {
  it("starts at 1 and is max+1", () => {
    expect(nextId([])).toBe(1);
    expect(nextId([{ id: 3 }, { id: 1 }, { id: 7 }])).toBe(8);
  });
});
