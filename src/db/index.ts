/** Public surface of the data layer. */

export type { Database, ExerciseEntry, Food, Measurement, ProteinEntry } from "./types";
export { emptyDb, seedDb, loadDb, serializeDb, nextId } from "./db";
export {
  type FoodInput,
  listFoods,
  findFood,
  addFood,
  updateFood,
  deleteFood,
  proteinEntries,
  logProtein,
  deleteProteinEntry,
} from "./foods";
export { type MeasurementFields, getMeasurement, upsertMeasurement } from "./measurements";
export { exportCsv, exportJson, importCsv, importJson } from "./csv";
export { getGoals, getGoal, setGoal, proteinGoal, exerciseTargets } from "./goals";
export { type DayExercise, getExercises, setExercise } from "./exercise";
export { type DaySnapshot, getDay, goalMet, proteinZone } from "./day";
export {
  type Period,
  todayStr,
  dayNumber,
  weekday,
  addDays,
  daysBetween,
  dateRange,
  weekRange,
  monthRange,
  periodRange,
} from "./dates";
export {
  type ValuePoint,
  type BpPoint,
  type NumericMetric,
  type ProteinSummary,
  type ExerciseSummary,
  type ExercisePerType,
  type WeightSummary,
  type BpSummary,
  type StreakResult,
  type HeatmapCell,
  type Heatmap,
  dailySeries,
  bpSeries,
  proteinSummary,
  exerciseSummary,
  weightSummary,
  bpSummary,
  streak,
  firstLogDate,
  heatmap,
} from "./insights";
