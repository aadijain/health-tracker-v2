/** Browser helpers for downloading generated files and reading a picked file. */

/** Trigger a download of `text` as a file named `filename`. */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  // Revoke after the click has had a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A timestamp suffix for backup filenames, e.g. `2026-06-24`. */
export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Read a user-picked file as text. Resolves to null if the picker is dismissed. */
export function pickTextFile(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file
        .text()
        .then((text) => resolve({ name: file.name, text }))
        .catch(() => reject(new Error("Could not read that file.")));
    });
    // Some browsers do not fire `change` on cancel; that simply leaves the promise pending,
    // which is harmless since the picker is one-shot per click.
    input.click();
  });
}
