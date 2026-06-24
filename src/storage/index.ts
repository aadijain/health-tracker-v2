/** Public surface of the storage layer, plus the wiring that composes it. */

import { DRIVE_DB_FILENAME, GOOGLE_CLIENT_ID } from "../config";
import { GoogleAuth } from "./auth";
import { DriveApiClient } from "./drive";
import { SyncEngine } from "./sync";

export { GoogleAuth } from "./auth";
export { DriveApiClient } from "./drive";
export { SyncEngine, type SyncEngineOptions } from "./sync";
export type { DriveClient, DriveFile, SyncStatus } from "./types";

export interface Storage {
  auth: GoogleAuth;
  sync: SyncEngine;
}

/**
 * Build the storage stack from config: Google auth -> Drive client (using the
 * auth token) -> sync engine bound to the data file.
 */
export function createStorage(): Storage {
  const auth = new GoogleAuth(GOOGLE_CLIENT_ID);
  const drive = new DriveApiClient(() => auth.ensureToken());
  const sync = new SyncEngine(drive, { filename: DRIVE_DB_FILENAME });
  return { auth, sync };
}
