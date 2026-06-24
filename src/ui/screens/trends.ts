/**
 * Trends: a calendar week (Mon-Sun) or month with prev/next navigation, a
 * `days met / N` summary for the selected metric, and a chart of its daily
 * series. "Next" is disabled once you reach the period containing today.
 */

import { type Period, addDays, bpSeries, dailySeries, periodRange } from "../../db";
import { exerciseSummary, proteinSummary, weightSummary } from "../../db";
import type { App } from "../app";
import { renderChart } from "../chart";
import { escapeHtml, formatNumber } from "../dom";

type TrendMetric = "protein" | "exercise" | "weight" | "bp";

interface TrendsState {
  metric: TrendMetric;
  period: Period;
  anchor: string;
}

let state: TrendsState | null = null;

const METRIC_LABELS: Record<TrendMetric, string> = {
  protein: "Protein",
  exercise: "Exercise",
  weight: "Weight",
  bp: "Blood pressure",
};

export function renderTrends(app: App, container: HTMLElement): void {
  if (!state) {
    state = { metric: "protein", period: "week", anchor: app.today };
  }
  const s = state;
  const [start, end] = periodRange(s.period, s.anchor);
  const atCurrent = end >= periodRange(s.period, app.today)[1];

  container.innerHTML = `
    <div class="trend-controls">
      <select data-metric>
        ${(Object.keys(METRIC_LABELS) as TrendMetric[])
          .map(
            (m) =>
              `<option value="${m}" ${m === s.metric ? "selected" : ""}>${METRIC_LABELS[m]}</option>`,
          )
          .join("")}
      </select>
      <div class="seg">
        <button class="seg-btn ${s.period === "week" ? "is-active" : ""}" data-period="week" type="button">Week</button>
        <button class="seg-btn ${s.period === "month" ? "is-active" : ""}" data-period="month" type="button">Month</button>
      </div>
    </div>

    <div class="period-nav">
      <button class="link-btn" type="button" data-prev aria-label="Previous">‹</button>
      <span class="period-label">${escapeHtml(periodLabel(s.period, start, end))}</span>
      <button class="link-btn" type="button" data-next aria-label="Next" ${atCurrent ? "disabled" : ""}>›</button>
    </div>

    <section class="card">
      ${summaryHtml(app, s.metric, start, end)}
    </section>

    <section class="card">
      <canvas data-chart height="180"></canvas>
    </section>`;

  drawChart(app, s.metric, start, end, container);
  wire(app, container);
}

function summaryHtml(app: App, metric: TrendMetric, start: string, end: string): string {
  if (metric === "protein") {
    const sum = proteinSummary(app.db, start, end);
    return statRow([
      [`${sum.daysMet} / ${sum.days}`, "days met"],
      [`${formatNumber(sum.avg)} g`, "avg / logged day"],
      [`${formatNumber(sum.total)} g`, "total"],
    ]);
  }
  if (metric === "exercise") {
    const sum = exerciseSummary(app.db, start, end);
    const perEx = sum.perExercise
      .map(
        (e) =>
          `<li><span>${escapeHtml(e.label)}</span><strong>${e.count} / ${formatNumber(e.target)}</strong></li>`,
      )
      .join("");
    return `${statRow([
      [`${sum.daysActive} / ${sum.days}`, "active days"],
      [`${sum.totalDone}`, "total sessions"],
    ])}<ul class="per-ex">${perEx}</ul>`;
  }
  if (metric === "weight") {
    const sum = weightSummary(app.db, start, end);
    return statRow([
      [sum.avg !== null ? `${formatNumber(sum.avg)} kg` : "-", "avg"],
      [sum.latest !== null ? `${formatNumber(sum.latest)} kg` : "-", "latest"],
      [
        sum.change !== null ? `${sum.change > 0 ? "+" : ""}${formatNumber(sum.change)} kg` : "-",
        "change",
      ],
    ]);
  }
  const series = bpSeries(app.db, start, end);
  const sysv = series.map((r) => r.systolic).filter((v): v is number => v !== null);
  const diav = series.map((r) => r.diastolic).filter((v): v is number => v !== null);
  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  const sys = avg(sysv);
  const dia = avg(diav);
  return statRow([
    [sys !== null && dia !== null ? `${sys}/${dia}` : "-", "avg BP"],
    [`${sysv.length}`, "days logged"],
  ]);
}

function statRow(stats: [string, string][]): string {
  return `<div class="stat-row">${stats
    .map(
      ([value, label]) =>
        `<div class="stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`,
    )
    .join("")}</div>`;
}

function drawChart(
  app: App,
  metric: TrendMetric,
  start: string,
  end: string,
  container: HTMLElement,
): void {
  const canvas = container.querySelector<HTMLCanvasElement>("[data-chart]");
  if (!canvas) {
    return;
  }
  const labels = (arr: { date: string }[]) => arr.map((r) => r.date.slice(8));

  if (metric === "bp") {
    const series = bpSeries(app.db, start, end);
    renderChart(canvas, {
      type: "line",
      data: {
        labels: labels(series),
        datasets: [
          line(
            "Systolic",
            series.map((r) => r.systolic),
            "#dc2626",
          ),
          line(
            "Diastolic",
            series.map((r) => r.diastolic),
            "#2563eb",
          ),
        ],
      },
      options: chartOptions(false),
    });
    return;
  }

  const series = dailySeries(app.db, metric, start, end);
  if (metric === "weight") {
    renderChart(canvas, {
      type: "line",
      data: {
        labels: labels(series),
        datasets: [
          line(
            "Weight",
            series.map((r) => r.value),
            "#4f46e5",
          ),
        ],
      },
      options: chartOptions(false),
    });
    return;
  }
  const color = metric === "protein" ? "#4f46e5" : "#16a34a";
  renderChart(canvas, {
    type: "bar",
    data: {
      labels: labels(series),
      datasets: [
        {
          label: METRIC_LABELS[metric],
          data: series.map((r) => r.value ?? 0),
          backgroundColor: color,
        },
      ],
    },
    options: chartOptions(true),
  });
}

function line(label: string, data: (number | null)[], color: string) {
  return { label, data, borderColor: color, backgroundColor: color, tension: 0.3, spanGaps: true };
}

function chartOptions(beginAtZero: boolean) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero } },
  };
}

function periodLabel(period: Period, start: string, end: string): string {
  if (period === "month") {
    const [y, m] = start.split("-").map(Number);
    return `${new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en", { month: "long" })} ${y}`;
  }
  return `${start.slice(5)} - ${end.slice(5)}`;
}

function wire(app: App, container: HTMLElement): void {
  const s = state;
  if (!s) {
    return;
  }
  container.querySelector<HTMLSelectElement>("[data-metric]")?.addEventListener("change", (e) => {
    s.metric = (e.target as HTMLSelectElement).value as TrendMetric;
    renderTrends(app, container);
  });
  for (const button of container.querySelectorAll<HTMLButtonElement>("[data-period]")) {
    button.addEventListener("click", () => {
      s.period = button.dataset.period as Period;
      s.anchor = app.today;
      renderTrends(app, container);
    });
  }
  container.querySelector("[data-prev]")?.addEventListener("click", () => {
    s.anchor = addDays(periodRange(s.period, s.anchor)[0], -1);
    renderTrends(app, container);
  });
  container.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => {
    s.anchor = addDays(periodRange(s.period, s.anchor)[1], 1);
    renderTrends(app, container);
  });
}
