import { APP_NAME } from "./config";
import "./style.css";
import { App } from "./ui/app";
import { mountErrorBanner } from "./ui/errorBanner";
import { renderToday } from "./ui/screens/today";

/** The primary navigation tabs, in display order. */
interface Tab {
  id: string;
  label: string;
  /** Emoji icon shown in the bottom navigation. */
  icon: string;
  render: (app: App, container: HTMLElement) => void;
}

function placeholder(label: string): (app: App, container: HTMLElement) => void {
  return (_app, container) => {
    container.innerHTML = `<p class="empty">${label} is coming soon.</p>`;
  };
}

const TABS: readonly Tab[] = [
  { id: "today", label: "Today", icon: "☀️", render: renderToday },
  { id: "trends", label: "Trends", icon: "📈", render: placeholder("Trends") },
  { id: "activity", label: "Activity", icon: "🟩", render: placeholder("Activity") },
  { id: "foods", label: "Foods", icon: "🥗", render: placeholder("Foods") },
  { id: "settings", label: "Settings", icon: "⚙️", render: placeholder("Settings") },
];

function render(root: HTMLElement, app: App): void {
  root.innerHTML = `
    <header class="app-header">
      <div class="bar">
        <div class="app-title">
          <img class="app-logo" src="${import.meta.env.BASE_URL}favicon.svg" alt="" />
          <h1>${APP_NAME}</h1>
        </div>
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
  let activeTab = TABS[0];

  const draw = (): void => {
    for (const button of buttons) {
      button.classList.toggle("is-active", button.dataset.tab === activeTab.id);
    }
    if (screen) {
      activeTab.render(app, screen);
    }
  };

  app.onChange = draw;

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
}

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  render(root, new App());
}
