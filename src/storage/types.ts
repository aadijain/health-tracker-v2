/**
 * Storage-layer contracts.
 *
 * The sync engine talks to Drive only through `DriveClient`, so the real REST
 * implementation and a fake can be swapped freely (and the engine unit-tested).
 */

/** A file in the user's private appDataFolder. */
export interface DriveFile {
  id: string;
  /** RFC 3339 timestamp Drive last modified the file; used for conflict detection. */
  modifiedTime: string;
}

export interface DriveClient {
  /** Locate the data file by name, or null if it does not exist yet. */
  find(name: string): Promise<DriveFile | null>;
  /** Download a file's text content. */
  download(id: string): Promise<string>;
  /** Create the data file with the given content. */
  create(name: string, content: string): Promise<DriveFile>;
  /** Overwrite an existing file's content. */
  update(id: string, content: string): Promise<DriveFile>;
  /** Current metadata for a file, or null if it was deleted remotely. */
  stat(id: string): Promise<DriveFile | null>;
}

export type SyncStatus =
  | "idle" // nothing to sync
  | "syncing" // upload/download in flight
  | "synced" // local matches Drive
  | "offline" // last attempt failed; changes kept locally and will retry
  | "conflict"; // Drive changed elsewhere; local changes withheld to avoid clobbering
