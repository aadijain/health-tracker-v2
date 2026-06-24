/**
 * A small styled autocomplete dropdown for a text input. Unlike a native
 * `<datalist>`, its appearance is fully ours, so suggestions can show a primary
 * label (the name) plus a muted detail line and match the rest of the UI.
 *
 * Choosing an item sets the input's value to `item.value`; typing a value that
 * isn't in the list is still allowed (the input stays free-text).
 */

import { escapeHtml } from "./dom";

export interface AutocompleteItem {
  /** Inserted into the input when chosen. */
  value: string;
  /** Bold primary text (typically the name). */
  primary: string;
  /** Muted secondary text (e.g. portion and protein). */
  secondary?: string;
}

export function mountAutocomplete(config: {
  input: HTMLInputElement;
  list: HTMLElement;
  items: readonly AutocompleteItem[];
  /** Maximum suggestions shown at once. */
  max?: number;
}): void {
  const { input, list, items } = config;
  const max = config.max ?? 8;
  let active = -1;
  let shown: AutocompleteItem[] = [];

  const close = (): void => {
    list.hidden = true;
    active = -1;
  };

  const render = (): void => {
    const query = input.value.trim().toLowerCase();
    shown = items.filter((it) => it.primary.toLowerCase().includes(query)).slice(0, max);
    if (shown.length === 0) {
      close();
      return;
    }
    list.innerHTML = shown
      .map(
        (it, i) =>
          `<li class="ac-item${i === active ? " is-active" : ""}" data-i="${i}">
             <span class="ac-name">${escapeHtml(it.primary)}</span>
             ${it.secondary ? `<span class="ac-detail">${escapeHtml(it.secondary)}</span>` : ""}
           </li>`,
      )
      .join("");
    list.hidden = false;
  };

  const choose = (index: number): void => {
    const item = shown[index];
    if (!item) {
      return;
    }
    input.value = item.value;
    close();
  };

  input.addEventListener("input", () => {
    active = -1;
    render();
  });
  input.addEventListener("focus", render);
  // Delay so a click on an item registers before the list closes.
  input.addEventListener("blur", () => setTimeout(close, 120));

  input.addEventListener("keydown", (event) => {
    if (list.hidden) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      active = Math.min(active + 1, shown.length - 1);
      render();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      active = Math.max(active - 1, 0);
      render();
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      close();
    }
  });

  // mousedown fires before the input's blur; preventDefault keeps focus.
  list.addEventListener("mousedown", (event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(".ac-item");
    if (item) {
      event.preventDefault();
      choose(Number(item.dataset.i));
    }
  });
}
