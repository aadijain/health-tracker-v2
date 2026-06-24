/**
 * Activity: current and longest streaks above a continuous GitHub-style heatmap
 * from the first log to today (Monday-first columns), auto-scrolled to today.
 */

import { addDays, firstLogDate, heatmap, streak, weekday } from "../../db";
import type { App } from "../app";
import { escapeHtml, formatNumber } from "../dom";

type ActivityMetric = "protein" | "exercise";

let metric: ActivityMetric = "protein";

const METRIC_LABELS: Record<ActivityMetric, string> = {
  protein: "Protein",
  exercise: "Exercise",
};

export function renderActivity(app: App, container: HTMLElement): void {
  const s = streak(app.db, metric, app.today);
  const first = firstLogDate(app.db, metric);

  let grid = '<p class="empty">No activity logged yet.</p>';
  if (first) {
    // Pad the start back to its Monday so columns line up as whole weeks.
    const start = addDays(first, -weekday(first));
    const cells = heatmap(app.db, metric, start, app.today).cells;
    grid = `<div class="heatmap-scroll"><div class="heatmap">${cells
      .map(
        (c) =>
          `<span class="cell lvl-${c.level}" title="${c.date}: ${formatNumber(c.value)}"></span>`,
      )
      .join("")}</div></div>`;
  }

  container.innerHTML = `
    <div class="trend-controls">
      <select data-metric>
        ${(Object.keys(METRIC_LABELS) as ActivityMetric[])
          .map(
            (m) =>
              `<option value="${m}" ${m === metric ? "selected" : ""}>${METRIC_LABELS[m]}</option>`,
          )
          .join("")}
      </select>
    </div>

    <section class="card">
      <div class="stat-row">
        <div class="stat"><strong>${s.current}</strong><span>current streak</span></div>
        <div class="stat"><strong>${s.longest}</strong><span>longest streak</span></div>
      </div>
    </section>

    <section class="card">
      <h3 class="card-title">${escapeHtml(METRIC_LABELS[metric])} activity</h3>
      ${grid}
    </section>`;

  // Auto-scroll the heatmap to today (the right edge).
  const scroller = container.querySelector<HTMLElement>(".heatmap-scroll");
  if (scroller) {
    scroller.scrollLeft = scroller.scrollWidth;
  }

  container.querySelector<HTMLSelectElement>("[data-metric]")?.addEventListener("change", (e) => {
    metric = (e.target as HTMLSelectElement).value as ActivityMetric;
    renderActivity(app, container);
  });
}
