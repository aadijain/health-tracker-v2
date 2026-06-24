import { APP_NAME } from "./config";
import "./style.css";

/** The primary navigation tabs, in display order. */
interface Tab {
  id: string;
  label: string;
  /** Emoji icon shown in the bottom navigation. */
  icon: string;
}

const TABS: readonly Tab[] = [
  { id: "today", label: "Today", icon: "☀️" },
  { id: "trends", label: "Trends", icon: "📈" },
  { id: "activity", label: "Activity", icon: "🟩" },
  { id: "foods", label: "Foods", icon: "🥗" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

function render(root: HTMLElement): void {
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

  const screen = root.querySelector<HTMLElement>("#screen");
  const buttons = root.querySelectorAll<HTMLButtonElement>(".tab-btn");

  const select = (id: string): void => {
    const tab = TABS.find((t) => t.id === id) ?? TABS[0];
    for (const button of buttons) {
      button.classList.toggle("is-active", button.dataset.tab === tab.id);
    }
    if (screen) {
      screen.innerHTML = `<h2 class="screen-title">${tab.label}</h2>`;
    }
  };

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const id = button.dataset.tab;
      if (id) {
        select(id);
      }
    });
  }

  select(TABS[0].id);
}

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  render(root);
}
