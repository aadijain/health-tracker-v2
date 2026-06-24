import { beforeEach, describe, expect, it } from "vitest";
import { emptyDb } from "./db";
import {
  addFood,
  deleteFood,
  deleteProteinEntry,
  findFood,
  logProtein,
  proteinEntries,
  updateFood,
} from "./foods";
import type { Database } from "./types";

let db: Database;
beforeEach(() => {
  db = emptyDb();
});

describe("foods CRUD", () => {
  it("adds, finds case-insensitively, and assigns sequential ids", () => {
    const a = addFood(db, { name: "Milk", portion: "1 glass", protein: 8 });
    const b = addFood(db, { name: "Tofu", portion: "100 g", protein: 8 });
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(findFood(db, "milk")?.id).toBe(1);
  });

  it("rejects blank and duplicate names", () => {
    addFood(db, { name: "Milk", portion: "1 glass", protein: 8 });
    expect(() => addFood(db, { name: "  ", portion: "", protein: 1 })).toThrow();
    expect(() => addFood(db, { name: "MILK", portion: "x", protein: 1 })).toThrow(/already/);
  });

  it("rejects negative protein", () => {
    expect(() => addFood(db, { name: "X", portion: "", protein: -1 })).toThrow();
  });

  it("updates fields and guards name collisions", () => {
    addFood(db, { name: "Milk", portion: "1 glass", protein: 8 });
    const tofu = addFood(db, { name: "Tofu", portion: "100 g", protein: 8 });
    updateFood(db, tofu.id, { protein: 9 });
    expect(findFood(db, "Tofu")?.protein).toBe(9);
    expect(() => updateFood(db, tofu.id, { name: "Milk" })).toThrow(/already/);
    // renaming to its own name is allowed
    expect(() => updateFood(db, tofu.id, { name: "Tofu" })).not.toThrow();
  });

  it("deletes by id", () => {
    const a = addFood(db, { name: "Milk", portion: "1 glass", protein: 8 });
    deleteFood(db, a.id);
    expect(db.foods).toHaveLength(0);
  });
});

describe("protein log", () => {
  beforeEach(() => {
    addFood(db, { name: "Milk", portion: "1 glass", protein: 8 });
  });

  it("snapshots protein as food x quantity, rounded to 1dp", () => {
    const e = logProtein(db, { date: "2026-06-01", food: "milk", quantity: 1.5 });
    expect(e.protein).toBe(12);
    expect(e.food).toBe("Milk"); // canonical name snapshotted
  });

  it("editing the food does not rewrite logged history", () => {
    logProtein(db, { date: "2026-06-01", food: "Milk", quantity: 1 });
    const milk = findFood(db, "Milk");
    updateFood(db, milk?.id ?? 0, { protein: 99 });
    expect(proteinEntries(db, "2026-06-01")[0].protein).toBe(8);
  });

  it("rejects unknown food and non-positive quantity", () => {
    expect(() => logProtein(db, { date: "2026-06-01", food: "Ghost", quantity: 1 })).toThrow();
    expect(() => logProtein(db, { date: "2026-06-01", food: "Milk", quantity: 0 })).toThrow();
  });

  it("filters entries by date and deletes by id", () => {
    const e1 = logProtein(db, { date: "2026-06-01", food: "Milk", quantity: 1 });
    logProtein(db, { date: "2026-06-02", food: "Milk", quantity: 1 });
    expect(proteinEntries(db, "2026-06-01")).toHaveLength(1);
    deleteProteinEntry(db, e1.id);
    expect(proteinEntries(db, "2026-06-01")).toHaveLength(0);
  });
});
