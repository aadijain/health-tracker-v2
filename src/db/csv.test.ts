import { describe, expect, it } from "vitest";
import { exportCsv, exportJson, importCsv, importJson } from "./csv";
import { emptyDb, seedDb } from "./db";
import type { Database } from "./types";

function sample(): Database {
  const db = emptyDb();
  db.foods = [
    { id: 1, name: "Tofu", portion: "100 g", protein: 8 },
    { id: 2, name: 'Curd, "plain"', portion: "1 cup", protein: 6 },
  ];
  db.proteinLog = [{ id: 1, date: "2026-06-01", food: "Tofu", quantity: 2, protein: 16 }];
  db.measurements = [{ date: "2026-06-01", weight: 70, systolic: 120, diastolic: 80, pulse: null }];
  db.exerciseLog = [
    { date: "2026-06-01", type: "cardio", done: true, note: "" },
    { date: "2026-06-01", type: "bonus", done: false, note: "walked\nthe dog" },
  ];
  db.goals = { protein_g: "84", cardio_per_week: "5" };
  return db;
}

describe("CSV round-trip", () => {
  it("restores an equivalent document from its own export", () => {
    const db = sample();
    const restored = importCsv(exportCsv(db), emptyDb());
    expect(restored).toEqual(db);
  });

  it("preserves commas, quotes, and newlines in fields", () => {
    const db = sample();
    const csv = exportCsv(db);
    const restored = importCsv(csv, emptyDb());
    expect(restored.foods[1].name).toBe('Curd, "plain"');
    expect(restored.exerciseLog[1].note).toBe("walked\nthe dog");
  });
});

describe("importCsv", () => {
  it("replaces only the tables present, leaving others untouched", () => {
    const base = seedDb();
    const before = base.foods.length;
    const result = importCsv("# goals\nkey,value\nprotein_g,100\n", base);
    expect(result.goals).toEqual({ protein_g: "100" });
    expect(result.foods.length).toBe(before);
  });

  it("renumbers protein-log ids sequentially", () => {
    const csv = [
      "# protein_log",
      "id,date,food,quantity,protein",
      "99,2026-06-01,Tofu,1,8",
      "42,2026-06-02,Tofu,2,16",
      "",
    ].join("\n");
    const result = importCsv(csv, emptyDb());
    expect(result.proteinLog.map((e) => e.id)).toEqual([1, 2]);
  });

  it("rejects an unknown exercise with a row-numbered error", () => {
    const csv = "# exercise_log\ndate,type,done,note\n2026-06-01,jogging,true,\n";
    expect(() => importCsv(csv, emptyDb())).toThrow(/exercise_log row 2.*jogging/);
  });

  it("rejects a bad date", () => {
    const csv = "# measurements\ndate,weight,systolic,diastolic,pulse\n06/01/2026,70,,,\n";
    expect(() => importCsv(csv, emptyDb())).toThrow(/valid date/);
  });

  it("rejects duplicate measurement dates", () => {
    const csv =
      "# measurements\ndate,weight,systolic,diastolic,pulse\n2026-06-01,70,,,\n2026-06-01,71,,,\n";
    expect(() => importCsv(csv, emptyDb())).toThrow(/duplicate date/);
  });

  it("rejects mismatched columns", () => {
    expect(() => importCsv("# foods\nname,grams\nTofu,8\n", emptyDb())).toThrow(/columns must be/);
  });

  it("rejects an unknown table", () => {
    expect(() => importCsv("# widgets\na,b\n1,2\n", emptyDb())).toThrow(/Unknown table/);
  });

  it("skips blank lines and defaults a blank portion", () => {
    const csv = "# foods\nname,portion,protein\nTofu,,8\n\n";
    const result = importCsv(csv, emptyDb());
    expect(result.foods).toEqual([{ id: 1, name: "Tofu", portion: "1 serving", protein: 8 }]);
  });

  it("accepts varied truthy values for exercise done", () => {
    const csv =
      "# exercise_log\ndate,type,done,note\n2026-06-01,cardio,yes,\n2026-06-02,cardio,0,\n";
    const result = importCsv(csv, emptyDb());
    expect(result.exerciseLog.map((e) => e.done)).toEqual([true, false]);
  });
});

describe("JSON backup", () => {
  it("round-trips through export/import", () => {
    const db = sample();
    expect(importJson(exportJson(db))).toEqual(db);
  });

  it("rejects non-object JSON", () => {
    expect(() => importJson("[1,2,3]")).toThrow(/valid JSON backup/);
    expect(() => importJson("not json")).toThrow(/valid JSON backup/);
  });
});
