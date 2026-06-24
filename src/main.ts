import { APP_NAME } from "./config";
import "./style.css";
import { App } from "./ui/app";
import { mountErrorBanner } from "./ui/errorBanner";
import { renderActivity } from "./ui/screens/activity";
import { renderFoods } from "./ui/screens/foods";
import { renderSettings } from "./ui/screens/settings";
import { renderToday } from "./ui/screens/today";
import { renderTrends } from "./ui/screens/trends";

/** The primary navigation tabs, in display order. */
interface Tab {
  id: string;
  label: string;
  /** Emoji icon shown in the bottom navigation. */
  icon: string;
  render: (app: App, container: HTMLElement) => void;
}

const TABS: readonly Tab[] = [
  { id: "today", label: "Today", icon: "☀️", render: renderToday },
  { id: "trends", label: "Trends", icon: "📈", render: renderTrends },
  { id: "activity", label: "Activity", icon: "🟩", render: renderActivity },
  { id: "foods", label: "Foods", icon: "🥗", render: renderFoods },
  { id: "settings", label: "Settings", icon: "⚙️", render: renderSettings },
];

function render(root: HTMLElement, app: App): void {
  root.innerHTML = `
    <header class="app-header">
      <div class="bar">
        <div class="app-title">
          <img class="app-logo" src="${import.meta.env.BASE_URL}favicon.svg" alt="" />
          <h1>${APP_NAME}</h1>
        </div>
        <input type="date" class="header-date" data-date max="${app.today}" hidden />
      </div>
    </header>
    <main id="screen" class="screen"></main>
    <nav class="tab-bar">
      <div class="bar">
        ${TABS.map(
          (tab) => `
          <button class="tab-btn" type="button" data-tab="${tab.id}">
            <span class="ico">${tab.icon}</span>
            <span class="tab-label">${tab.label}</span>
          </button>`,
        ).join("")}
      </div>
    </nav>`;

  const banner = mountErrorBanner(root);
  app.onError = (message) => banner.show(message);

  const screen = root.querySelector<HTMLElement>("#screen");
  const buttons = root.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const dateInput = root.querySelector<HTMLInputElement>(".header-date");
  let activeTab = TABS[0];

  const draw = (): void => {
    for (const button of buttons) {
      button.classList.toggle("is-active", button.dataset.tab === activeTab.id);
    }
    // The date picker only applies to Today; keep it in sync and hide elsewhere.
    if (dateInput) {
      const onToday = activeTab.id === "today";
      dateInput.hidden = !onToday;
      if (onToday) {
        dateInput.value = app.viewDate;
      }
    }
    if (screen) {
      activeTab.render(app, screen);
    }
  };

  app.onChange = draw;

  dateInput?.addEventListener("change", () => {
    if (dateInput.value) {
      app.viewDate = dateInput.value;
      draw();
    }
  });

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tab = TABS.find((t) => t.id === button.dataset.tab);
      if (tab) {
        activeTab = tab;
        draw();
      }
    });
  }

  draw();

  // Reconnect from a cached token (if any) without prompting; redraws on success.
  void app.resume();
}

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  render(root, new App());
}
