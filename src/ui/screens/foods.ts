/**
 * Foods: a collapsed one-line row per food that expands to edit or delete, plus
 * an add-food form. No categories.
 */

import { addFood, deleteFood, listFoods, updateFood } from "../../db";
import { type App, tryWrite } from "../app";
import { escapeHtml, formatNumber, parseNumber } from "../dom";

export function renderFoods(app: App, container: HTMLElement): void {
  const foods = listFoods(app.db);

  const rows = foods
    .map(
      (f) => `
      <li class="food-row" data-food="${f.id}">
        <button class="food-summary" type="button" data-toggle>
          <span class="food-name">${escapeHtml(f.name)}</span>
          <span class="food-meta">${escapeHtml(f.portion)} · ${formatNumber(f.protein)} g</span>
        </button>
        <div class="food-edit" hidden>
          <div class="field-row">
            <label class="field"><span>Name</span>
              <input type="text" data-edit="name" value="${escapeHtml(f.name)}" /></label>
          </div>
          <div class="field-row">
            <label class="field"><span>Portion</span>
              <input type="text" data-edit="portion" value="${escapeHtml(f.portion)}" /></label>
            <label class="field"><span>Protein (g)</span>
              <input type="number" inputmode="decimal" step="0.1" data-edit="protein" value="${f.protein}" /></label>
          </div>
          <p class="inline-error" data-edit-error hidden></p>
          <div class="row-actions">
            <button class="btn" type="button" data-save>Save</button>
            <button class="btn danger" type="button" data-delete>Delete</button>
          </div>
        </div>
      </li>`,
    )
    .join("");

  container.innerHTML = `
    <section class="card">
      <h3 class="card-title">Add food</h3>
      <form class="add-form" data-add>
        <div class="field-row">
          <label class="field"><span>Name</span>
            <input type="text" name="name" required /></label>
        </div>
        <div class="field-row">
          <label class="field"><span>Portion</span>
            <input type="text" name="portion" placeholder="e.g. 1 cup" /></label>
          <label class="field"><span>Protein (g)</span>
            <input type="number" name="protein" inputmode="decimal" step="0.1" min="0" value="0" /></label>
        </div>
        <p class="inline-error" data-add-error hidden></p>
        <button class="btn" type="submit">Add food</button>
      </form>
    </section>

    <ul class="food-list">${rows || '<li class="empty">No foods yet.</li>'}</ul>`;

  wire(app, container);
}

function wire(app: App, container: HTMLElement): void {
  const addForm = container.querySelector<HTMLFormElement>("[data-add]");
  const addError = container.querySelector<HTMLElement>("[data-add-error]");
  addForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(addForm);
    if (addError) {
      addError.hidden = true;
    }
    tryWrite(
      app,
      () =>
        addFood(app.db, {
          name: String(data.get("name") ?? ""),
          portion: String(data.get("portion") ?? ""),
          protein: parseNumber(String(data.get("protein") ?? "")) ?? 0,
        }),
      (message) => showInline(addError, message),
    );
  });

  for (const row of container.querySelectorAll<HTMLLIElement>(".food-row")) {
    const id = Number(row.dataset.food);
    const edit = row.querySelector<HTMLElement>(".food-edit");
    const error = row.querySelector<HTMLElement>("[data-edit-error]");

    row.querySelector("[data-toggle]")?.addEventListener("click", () => {
      if (edit) {
        edit.hidden = !edit.hidden;
      }
    });

    row.querySelector("[data-save]")?.addEventListener("click", () => {
      const get = (key: string) =>
        row.querySelector<HTMLInputElement>(`[data-edit="${key}"]`)?.value ?? "";
      if (error) {
        error.hidden = true;
      }
      tryWrite(
        app,
        () =>
          updateFood(app.db, id, {
            name: get("name"),
            portion: get("portion"),
            protein: parseNumber(get("protein")) ?? 0,
          }),
        (message) => showInline(error, message),
      );
    });

    row.querySelector("[data-delete]")?.addEventListener("click", () => {
      deleteFood(app.db, id);
      app.commit();
    });
  }
}

function showInline(element: HTMLElement | null, message: string): void {
  if (element) {
    element.textContent = message;
    element.hidden = false;
  }
}
