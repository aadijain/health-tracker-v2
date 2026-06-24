/**
 * Today: log the day's weight, blood pressure, protein, and exercise.
 * Summary rings show protein progress and exercises done. Weight/BP save on
 * blur; protein is logged from the food list; exercises are checkboxes (Bonus
 * Activity also has a free-text note).
 */

import type { ProteinZone } from "../../config";
import {
  type Food,
  deleteProteinEntry,
  getDay,
  listFoods,
  logProtein,
  setExercise,
  upsertMeasurement,
} from "../../db";
import { type App, tryWrite } from "../app";
import { mountAutocomplete } from "../autocomplete";
import { escapeHtml, formatNumber, parseNumber } from "../dom";

const ZONE_COLOR: Record<ProteinZone | "none", string> = {
  green: "#16a34a",
  yellow: "#ca8a04",
  orange: "#ea580c",
  red: "#dc2626",
  none: "#6b7280",
};

export function renderToday(app: App, container: HTMLElement): void {
  const day = getDay(app.db, app.today);
  const m = day.measurement;
  const zone = day.protein.zone;

  const proteinPct =
    day.protein.goal > 0 ? Math.round((day.protein.total / day.protein.goal) * 100) : 0;
  const exerciseTotal = day.exercise.total;

  const entries = day.protein.entries
    .map(
      (e) => `
      <li class="log-row">
        <span class="log-food">${escapeHtml(e.food)}</span>
        <span class="log-qty">x${formatNumber(e.quantity)}</span>
        <span class="log-protein">${formatNumber(e.protein)} g</span>
        <button class="link-btn danger" type="button" data-del="${e.id}" aria-label="Remove">×</button>
      </li>`,
    )
    .join("");

  const checklist = day.exercise.items
    .map(
      (ex) => `
      <li class="check-row">
        <label class="check">
          <input type="checkbox" data-ex="${ex.key}" ${ex.done ? "checked" : ""} />
          <span>${escapeHtml(ex.label)}</span>
        </label>
        ${
          ex.carriesNote
            ? `<input class="note-input" type="text" data-note="${ex.key}"
                 placeholder="Note" value="${escapeHtml(ex.note)}" />`
            : ""
        }
      </li>`,
    )
    .join("");

  container.innerHTML = `
    <div class="summary">
      ${ring(proteinPct, ZONE_COLOR[zone ?? "none"], `${proteinPct}%`, `Protein ${formatNumber(day.protein.total)}/${formatNumber(day.protein.goal)}g`)}
      ${ring(
        exerciseTotal > 0 ? (day.exercise.doneCount / exerciseTotal) * 100 : 0,
        ZONE_COLOR.green,
        String(day.exercise.doneCount),
        "Exercise done",
      )}
    </div>

    <section class="card">
      <h3 class="card-title">Measurements</h3>
      <div class="field-row">
        <label class="field">
          <span>Weight (kg)</span>
          <input type="number" inputmode="decimal" step="0.1" data-measure="weight"
            value="${m?.weight ?? ""}" />
        </label>
      </div>
      <div class="field-row three">
        <label class="field"><span>Systolic</span>
          <input type="number" inputmode="numeric" data-measure="systolic" value="${m?.systolic ?? ""}" /></label>
        <label class="field"><span>Diastolic</span>
          <input type="number" inputmode="numeric" data-measure="diastolic" value="${m?.diastolic ?? ""}" /></label>
        <label class="field"><span>Pulse</span>
          <input type="number" inputmode="numeric" data-measure="pulse" value="${m?.pulse ?? ""}" /></label>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h3 class="card-title">Protein</h3>
        <span class="chip zone-${zone ?? "none"}">${formatNumber(day.protein.total)} / ${formatNumber(day.protein.goal)} g</span>
      </div>
      <form class="log-form" data-log>
        <div class="autocomplete">
          <input type="text" name="food" placeholder="Search a food…" autocomplete="off" required data-food-input />
          <ul class="ac-list" data-food-list hidden></ul>
        </div>
        <input type="number" name="quantity" inputmode="decimal" step="0.5" min="0" value="1" class="qty" />
        <button class="btn" type="submit">Add</button>
      </form>
      <p class="inline-error" data-log-error hidden></p>
      <ul class="log-list">${entries || '<li class="empty">No protein logged yet.</li>'}</ul>
    </section>

    <section class="card">
      <h3 class="card-title">Exercise</h3>
      <ul class="check-list">${checklist}</ul>
    </section>`;

  wire(app, container);
}

/** Foods ordered most-recently-logged first, then the rest, so the empty-query
 * suggestions surface what was used recently. */
function foodsByRecency(app: App): Food[] {
  const foods = listFoods(app.db);
  const byName = new Map(foods.map((f) => [f.name.toLowerCase(), f]));
  const log = [...app.db.proteinLog].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    return b.id - a.id;
  });

  const recent: Food[] = [];
  const seen = new Set<string>();
  for (const entry of log) {
    const key = entry.food.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    const food = byName.get(key);
    if (food) {
      seen.add(key);
      recent.push(food);
    }
  }
  return [...recent, ...foods.filter((f) => !seen.has(f.name.toLowerCase()))];
}

/** An SVG progress ring (circumference 100) with centred text and a caption. */
function ring(percent: number, color: string, center: string, caption: string): string {
  const fill = Math.max(0, Math.min(100, percent));
  return `
    <div class="gauge">
      <svg viewBox="0 0 36 36" class="ring" role="img" aria-label="${escapeHtml(caption)}">
        <circle class="ring-track" cx="18" cy="18" r="15.915" />
        <circle class="ring-value" cx="18" cy="18" r="15.915"
          style="stroke:${color}; stroke-dasharray:${fill} 100" />
        <text class="ring-text" x="18" y="18">${escapeHtml(center)}</text>
      </svg>
      <span class="gauge-label">${escapeHtml(caption)}</span>
    </div>`;
}

function wire(app: App, container: HTMLElement): void {
  const foodInput = container.querySelector<HTMLInputElement>("[data-food-input]");
  const foodList = container.querySelector<HTMLElement>("[data-food-list]");
  if (foodInput && foodList) {
    mountAutocomplete({
      input: foodInput,
      list: foodList,
      items: foodsByRecency(app).map((f) => ({
        value: f.name,
        primary: f.name,
        secondary: `${f.portion} · ${formatNumber(f.protein)} g`,
      })),
    });
  }

  for (const input of container.querySelectorAll<HTMLInputElement>("[data-measure]")) {
    input.addEventListener("change", () => {
      const field = input.dataset.measure as "weight" | "systolic" | "diastolic" | "pulse";
      upsertMeasurement(app.db, app.today, { [field]: parseNumber(input.value) });
      app.commit();
    });
  }

  const form = container.querySelector<HTMLFormElement>("[data-log]");
  const logError = container.querySelector<HTMLElement>("[data-log-error]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const food = String(data.get("food") ?? "").trim();
    const quantity = parseNumber(String(data.get("quantity") ?? "")) ?? 0;
    if (logError) {
      logError.hidden = true;
    }
    tryWrite(
      app,
      () => logProtein(app.db, { date: app.today, food, quantity }),
      (message) => {
        if (logError) {
          logError.textContent = message;
          logError.hidden = false;
        }
      },
    );
  });

  for (const button of container.querySelectorAll<HTMLButtonElement>("[data-del]")) {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.del);
      deleteProteinEntry(app.db, id);
      app.commit();
    });
  }

  for (const box of container.querySelectorAll<HTMLInputElement>("[data-ex]")) {
    box.addEventListener("change", () => {
      setExercise(app.db, app.today, box.dataset.ex ?? "", { done: box.checked });
      app.commit();
    });
  }

  for (const note of container.querySelectorAll<HTMLInputElement>("[data-note]")) {
    note.addEventListener("change", () => {
      setExercise(app.db, app.today, note.dataset.note ?? "", { note: note.value });
      app.commit();
    });
  }
}
