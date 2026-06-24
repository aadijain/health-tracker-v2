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
export { getGoals, getGoal, setGoal, proteinGoal, exerciseTargets } from "./goals";
export { type DayExercise, getExercises, setExercise } from "./exercise";
export { type DaySnapshot, getDay, goalMet, proteinZone } from "./day";
