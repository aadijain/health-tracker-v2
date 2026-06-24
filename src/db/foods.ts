/**
 * Foods and the protein log.
 *
 * Foods are the reusable catalogue (name unique, case-insensitive). Logging
 * protein snapshots the computed grams onto the entry so later edits to a food
 * never rewrite history.
 */

import { nextId } from "./db";
import type { Database, Food, ProteinEntry } from "./types";

export interface FoodInput {
  name: string;
  portion: string;
  protein: number;
}

export function listFoods(db: Database): Food[] {
  return db.foods;
}

/** Find a food by name, case-insensitively. */
export function findFood(db: Database, name: string): Food | undefined {
  const key = name.trim().toLowerCase();
  return db.foods.find((f) => f.name.toLowerCase() === key);
}

export function addFood(db: Database, input: FoodInput): Food {
  const name = input.name.trim();
  if (name === "") {
    throw new Error("Food name is required.");
  }
  if (findFood(db, name)) {
    throw new Error(`"${name}" is already in your foods.`);
  }
  const food: Food = {
    id: nextId(db.foods),
    name,
    portion: input.portion.trim(),
    protein: requireProtein(input.protein),
  };
  db.foods.push(food);
  return food;
}

export function updateFood(db: Database, id: number, patch: Partial<FoodInput>): Food {
  const food = db.foods.find((f) => f.id === id);
  if (!food) {
    throw new Error("That food no longer exists.");
  }
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name === "") {
      throw new Error("Food name is required.");
    }
    const clash = findFood(db, name);
    if (clash && clash.id !== id) {
      throw new Error(`"${name}" is already in your foods.`);
    }
    food.name = name;
  }
  if (patch.portion !== undefined) {
    food.portion = patch.portion.trim();
  }
  if (patch.protein !== undefined) {
    food.protein = requireProtein(patch.protein);
  }
  return food;
}

export function deleteFood(db: Database, id: number): void {
  db.foods = db.foods.filter((f) => f.id !== id);
}

// --- Protein log ---------------------------------------------------------

export function proteinEntries(db: Database, date: string): ProteinEntry[] {
  return db.proteinLog.filter((e) => e.date === date);
}

/** Log a quantity of a known food; protein is snapshotted as food x quantity. */
export function logProtein(
  db: Database,
  args: { date: string; food: string; quantity: number },
): ProteinEntry {
  const quantity = args.quantity;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }
  const food = findFood(db, args.food);
  if (!food) {
    throw new Error(`"${args.food}" is not in your foods.`);
  }
  const entry: ProteinEntry = {
    id: nextId(db.proteinLog),
    date: args.date,
    food: food.name,
    quantity,
    protein: round1(food.protein * quantity),
  };
  db.proteinLog.push(entry);
  return entry;
}

export function deleteProteinEntry(db: Database, id: number): void {
  db.proteinLog = db.proteinLog.filter((e) => e.id !== id);
}

// --- Internal ------------------------------------------------------------

function requireProtein(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Protein must be zero or more grams.");
  }
  return value;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
