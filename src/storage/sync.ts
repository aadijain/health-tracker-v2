/**
 * Sync orchestration: own the link to the Drive data file and reconcile the
 * in-memory document with it.
 *
 * - `load` downloads the current file (or reports that none exists yet).
 * - `queue` schedules a debounced upload; rapid edits coalesce into one write.
 * - Before overwriting, the file's `modifiedTime` is compared with the one we
 *   last saw; if it changed elsewhere we withhold the write and report a conflict
 *   instead of clobbering (the phone+laptop case). The caller can then `reload`
 *   or `overwrite`.
 * - Upload failures degrade to `offline`: the pending content is retained and
 *   retried on the next queue/flush, so the app keeps working on the in-memory doc.
 */

import type { DriveClient, SyncStatus } from "./types";

export interface SyncEngineOptions {
  filename: string;
  /** Quiet period after the last edit before uploading. */
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 1500;

export class SyncEngine {
  private fileId: string | null = null;
  private knownModifiedTime: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingContent: string | null = null;
  private saving = false;
  private readonly debounceMs: number;

  status: SyncStatus = "idle";
  onStatus: ((status: SyncStatus) => void) | null = null;

  constructor(
    private readonly drive: DriveClient,
    private readonly options: SyncEngineOptions,
  ) {
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  }

  /** Whether the engine is bound to an existing Drive file. */
  get hasRemoteFile(): boolean {
    return this.fileId !== null;
  }

  /** Whether there are local changes not yet written to Drive. */
  get hasPendingChanges(): boolean {
    return this.pendingContent !== null;
  }

  /**
   * Download the current data file. Returns its text, or null when no file
   * exists yet (first run for this account).
   */
  async load(): Promise<string | null> {
    const file = await this.drive.find(this.options.filename);
    if (!file) {
      this.fileId = null;
      this.knownModifiedTime = null;
      return null;
    }
    const text = await this.drive.download(file.id);
    this.fileId = file.id;
    this.knownModifiedTime = file.modifiedTime;
    this.setStatus("synced");
    return text;
  }

  /** Record new content and schedule a debounced upload. */
  queue(content: string): void {
    this.pendingContent = content;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      void this.flush();
    }, this.debounceMs);
  }

  /**
   * Upload pending content now. Honours the conflict guard unless `force` is set
   * (used to deliberately overwrite remote after the user chooses "keep mine").
   */
  async flush(options: { force?: boolean } = {}): Promise<void> {
    this.cancelTimer();
    if (this.pendingContent === null || this.saving) {
      return;
    }
    const content = this.pendingContent;
    this.saving = true;
    this.setStatus("syncing");
    try {
      if (this.fileId === null) {
        const created = await this.drive.create(this.options.filename, content);
        this.bind(created);
      } else {
        if (!options.force && (await this.isStale())) {
          this.setStatus("conflict");
          return;
        }
        const updated = await this.drive.update(this.fileId, content);
        this.knownModifiedTime = updated.modifiedTime;
      }
      // Only clear if no newer edit arrived while we were uploading.
      if (this.pendingContent === content) {
        this.pendingContent = null;
      }
      this.setStatus(this.pendingContent === null ? "synced" : "idle");
    } catch {
      this.setStatus("offline");
    } finally {
      this.saving = false;
    }
  }

  /** Force the pending content to overwrite Drive, resolving a conflict in our favour. */
  async overwrite(): Promise<void> {
    await this.flush({ force: true });
  }

  /** Re-download the remote file, discarding the local pending write. */
  async reload(): Promise<string | null> {
    this.pendingContent = null;
    return this.load();
  }

  private async isStale(): Promise<boolean> {
    if (this.fileId === null || this.knownModifiedTime === null) {
      return false;
    }
    const remote = await this.drive.stat(this.fileId);
    return remote !== null && remote.modifiedTime !== this.knownModifiedTime;
  }

  private bind(file: { id: string; modifiedTime: string }): void {
    this.fileId = file.id;
    this.knownModifiedTime = file.modifiedTime;
  }

  private cancelTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.onStatus?.(status);
  }
}
