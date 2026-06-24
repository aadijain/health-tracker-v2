/**
 * A dismissible top-level error banner. The app's last-resort surface for
 * unexpected failures; it never blocks the UI (form-level validation errors are
 * shown inline by the screens instead).
 */

import { escapeHtml } from "./dom";

export interface ErrorBanner {
  show(message: string): void;
  clear(): void;
}

export function mountErrorBanner(parent: HTMLElement): ErrorBanner {
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.hidden = true;
  parent.prepend(banner);

  const clear = (): void => {
    banner.hidden = true;
    banner.innerHTML = "";
  };

  return {
    show(message: string): void {
      banner.innerHTML = `
        <span class="error-banner-msg">${escapeHtml(message)}</span>
        <button class="error-banner-close" type="button" aria-label="Dismiss">×</button>`;
      banner.querySelector(".error-banner-close")?.addEventListener("click", clear);
      banner.hidden = false;
    },
    clear,
  };
}
