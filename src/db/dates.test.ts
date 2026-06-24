import { describe, expect, it } from "vitest";
import {
  addDays,
  dateRange,
  dayNumber,
  daysBetween,
  monthRange,
  periodRange,
  todayStr,
  weekRange,
  weekday,
} from "./dates";

describe("dates", () => {
  it("todayStr formats local date as YYYY-MM-DD", () => {
    expect(todayStr(new Date(2026, 5, 7))).toBe("2026-06-07");
    expect(todayStr(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("weekday is Monday=0..Sunday=6", () => {
    expect(weekday("2026-06-22")).toBe(0); // Monday
    expect(weekday("2026-06-28")).toBe(6); // Sunday
  });

  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(daysBetween("2026-06-01", "2026-06-08")).toBe(7);
    expect(dayNumber("2026-06-02") - dayNumber("2026-06-01")).toBe(1);
  });

  it("dateRange is inclusive", () => {
    expect(dateRange("2026-06-01", "2026-06-03")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
    expect(dateRange("2026-06-05", "2026-06-05")).toEqual(["2026-06-05"]);
  });

  it("weekRange is Monday-Sunday containing the anchor", () => {
    expect(weekRange("2026-06-24")).toEqual(["2026-06-22", "2026-06-28"]);
    expect(weekRange("2026-06-22")).toEqual(["2026-06-22", "2026-06-28"]);
    expect(weekRange("2026-06-28")).toEqual(["2026-06-22", "2026-06-28"]);
  });

  it("monthRange covers the full calendar month", () => {
    expect(monthRange("2026-06-15")).toEqual(["2026-06-01", "2026-06-30"]);
    expect(monthRange("2026-02-10")).toEqual(["2026-02-01", "2026-02-28"]);
    expect(monthRange("2024-02-10")).toEqual(["2024-02-01", "2024-02-29"]); // leap
    expect(monthRange("2026-12-31")).toEqual(["2026-12-01", "2026-12-31"]);
  });

  it("periodRange dispatches on period", () => {
    expect(periodRange("week", "2026-06-24")).toEqual(weekRange("2026-06-24"));
    expect(periodRange("month", "2026-06-24")).toEqual(monthRange("2026-06-24"));
  });
});
