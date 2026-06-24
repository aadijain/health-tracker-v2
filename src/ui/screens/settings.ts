/**
 * Settings: the daily protein goal, a weekly target per exercise, and the Google
 * account connection. Goals save on change; connecting signs in and loads (or
 * initialises) the Drive document.
 */

import { EXERCISES, exerciseGoalKey } from "../../config";
import { getGoal, setGoal } from "../../db";
import type { SyncStatus } from "../../storage";
import type { App } from "../app";
import { escapeHtml } from "../dom";

/** GIS error types that mean the user dismissed the popup rather than a failure. */
const CANCELLED = new Set(["popup_closed", "popup_closed_by_user", "popup_failed_to_open"]);

const STATUS_LABEL: Record<SyncStatus, string> = {
  idle: "Up to date",
  syncing: "Syncing…",
  synced: "Synced to Drive",
  offline: "Offline - changes saved locally and will retry",
  conflict: "Drive changed elsewhere - reload or overwrite",
};

export function renderSettings(app: App, container: HTMLElement): void {
  const targets = EXERCISES.map(
    (ex) => `
      <label class="field">
        <span>${escapeHtml(ex.label)} (per week)</span>
        <input type="number" inputmode="numeric" min="0" max="7"
          data-goal="${exerciseGoalKey(ex.key)}" value="${escapeHtml(getGoal(app.db, exerciseGoalKey(ex.key)) ?? "0")}" />
      </label>`,
  ).join("");

  container.innerHTML = `
    <section class="card">
      <h3 class="card-title">Google Drive</h3>
      ${googleSection(app)}
    </section>

    <section class="card">
      <h3 class="card-title">Goals</h3>
      <label class="field">
        <span>Daily protein (g)</span>
        <input type="number" inputmode="numeric" min="0"
          data-goal="protein_g" value="${escapeHtml(getGoal(app.db, "protein_g") ?? "0")}" />
      </label>
      <h4 class="subhead">Weekly exercise targets</h4>
      <div class="goal-grid">${targets}</div>
    </section>`;

  wire(app, container);
}

function googleSection(app: App): string {
  if (!app.isConfigured) {
    return `<p class="empty">Google sign-in is not configured for this deployment.</p>`;
  }
  if (app.connected) {
    return `
      <p class="status-line">${escapeHtml(STATUS_LABEL[app.syncStatus])}</p>
      <button class="btn danger" type="button" data-disconnect>Disconnect</button>`;
  }
  return `
    <p class="muted-text">Connect to sync your data to your private Google Drive folder.</p>
    <p class="inline-error" data-connect-error hidden></p>
    <button class="btn" type="button" data-connect>Connect Google</button>`;
}

function wire(app: App, container: HTMLElement): void {
  for (const input of container.querySelectorAll<HTMLInputElement>("[data-goal]")) {
    input.addEventListener("change", () => {
      setGoal(app.db, input.dataset.goal ?? "", input.value.trim());
      app.commit();
    });
  }

  const connectError = container.querySelector<HTMLElement>("[data-connect-error]");
  container.querySelector("[data-connect]")?.addEventListener("click", () => {
    if (connectError) {
      connectError.hidden = true;
    }
    app.connect().catch((error: unknown) => {
      const raw = error instanceof Error ? error.message : "";
      // The user dismissing the consent popup is a cancellation, not an error.
      if (CANCELLED.has(raw)) {
        return;
      }
      if (connectError) {
        connectError.textContent = raw || "Could not connect to Google.";
        connectError.hidden = false;
      }
    });
  });

  container.querySelector("[data-disconnect]")?.addEventListener("click", () => {
    app.disconnect();
  });
}
