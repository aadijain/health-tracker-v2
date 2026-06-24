/** Thin chart.js wrapper: register once, render a config into a canvas. */

import { Chart, type ChartConfiguration, registerables } from "chart.js";

Chart.register(...registerables);

export function renderChart(canvas: HTMLCanvasElement, config: ChartConfiguration): Chart {
  return new Chart(canvas, config);
}

export { Chart };
export type { ChartConfiguration };
