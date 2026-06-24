/**
 * App context: owns the in-memory document, the storage stack, and the
 * connect/persist lifecycle. Screens read `app.db`, mutate it through the data
 * layer, then call `app.commit()` to persist (debounced) and trigger a re-render.
 *
 * Without a Google connection the app runs on a seeded in-memory document so it
 * is usable immediately; changes are only synced to Drive once connected.
 */

import { type Database, loadDb, seedDb, serializeDb, todayStr } from "../db";
import { type Storage, type SyncStatus, createStorage } from "../storage";

export class App {
  db: Database = seedDb();
  readonly storage: Storage = createStorage();
  readonly today = todayStr();
  connected = false;
  syncStatus: SyncStatus = "idle";

  /** Re-render the current screen. Set by the router. */
  onChange: (() => void) | null = null;
  /** Surface an unexpected error in the top-level banner. Set by the router. */
  onError: ((message: string) => void) | null = null;

  constructor() {
    this.storage.sync.onStatus = (status) => {
      this.syncStatus = status;
      this.onChange?.();
    };
  }

  get isConfigured(): boolean {
    return this.storage.auth.isConfigured;
  }

  /** Persist the current document (if connected) and re-render. */
  commit(): void {
    if (this.connected) {
      this.storage.sync.queue(serializeDb(this.db));
    }
    this.onChange?.();
  }

  /** Sign in to Google and load (or initialise) the Drive document. */
  async connect(): Promise<void> {
    await this.storage.auth.connect();
    const text = await this.storage.sync.load();
    if (text !== null) {
      this.db = loadDb(text);
    } else {
      // First connection for this account: persist what we have so far.
      this.storage.sync.queue(serializeDb(this.db));
    }
    this.connected = true;
    this.onChange?.();
  }

  disconnect(): void {
    this.storage.auth.disconnect();
    this.connected = false;
    this.onChange?.();
  }

  showError(message: string): void {
    this.onError?.(message);
  }
}

/** Run a data-layer write, surfacing thrown validation errors via `onInvalid`. */
export function tryWrite(
  app: App,
  write: () => void,
  onInvalid: (message: string) => void,
): boolean {
  try {
    write();
  } catch (error) {
    onInvalid(error instanceof Error ? error.message : "Something went wrong.");
    return false;
  }
  app.commit();
  return true;
}
