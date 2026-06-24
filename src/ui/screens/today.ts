/**
 * Today: log the day's weight, blood pressure, protein, and exercise.
 * Weight/BP save on blur; protein is logged from the food list; exercises are
 * checkboxes (Bonus Activity also has a free-text note).
 */

import {
  deleteProteinEntry,
  getDay,
  listFoods,
  logProtein,
  setExercise,
  upsertMeasurement,
} from "../../db";
import { type App, tryWrite } from "../app";
import { escapeHtml, formatNumber, parseNumber } from "../dom";

export function renderToday(app: App, container: HTMLElement): void {
  const day = getDay(app.db, app.today);
  const m = day.measurement;
  const zone = day.protein.zone;
  const foods = listFoods(app.db);

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
        <input list="food-options" name="food" class="grow" placeholder="Food" autocomplete="off" required />
        <input type="number" name="quantity" inputmode="decimal" step="0.5" min="0" value="1" class="qty" />
        <button class="btn" type="submit">Log</button>
      </form>
      <datalist id="food-options">
        ${foods.map((f) => `<option value="${escapeHtml(f.name)}"></option>`).join("")}
      </datalist>
      <p class="inline-error" data-log-error hidden></p>
      <ul class="log-list">${entries || '<li class="empty">No protein logged yet.</li>'}</ul>
    </section>

    <section class="card">
      <h3 class="card-title">Exercise</h3>
      <ul class="check-list">${checklist}</ul>
    </section>`;

  wire(app, container);
}

function wire(app: App, container: HTMLElement): void {
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
