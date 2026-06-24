/**
 * Drive REST client scoped to the private appDataFolder.
 *
 * The app can only see files it created in this hidden per-user folder, so there
 * is exactly one data file to find, download, and overwrite. Every request
 * carries a fresh access token from the auth layer.
 */

import type { DriveClient, DriveFile } from "./types";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const FILE_FIELDS = "id,modifiedTime";

export class DriveApiClient implements DriveClient {
  constructor(private readonly getToken: () => Promise<string>) {}

  async find(name: string): Promise<DriveFile | null> {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      q: `name = '${name.replace(/'/g, "\\'")}' and trashed = false`,
      fields: `files(${FILE_FIELDS})`,
      pageSize: "1",
    });
    const data = await this.request<{ files?: DriveFile[] }>(`${FILES_URL}?${params}`);
    return data.files?.[0] ?? null;
  }

  async download(id: string): Promise<string> {
    const token = await this.getToken();
    const res = await fetch(`${FILES_URL}/${id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw await driveError(res);
    }
    return res.text();
  }

  async create(name: string, content: string): Promise<DriveFile> {
    const metadata = { name, parents: ["appDataFolder"] };
    const body = multipart(metadata, content);
    const params = new URLSearchParams({ uploadType: "multipart", fields: FILE_FIELDS });
    return this.request<DriveFile>(`${UPLOAD_URL}?${params}`, {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${MULTIPART_BOUNDARY}` },
      body,
    });
  }

  async update(id: string, content: string): Promise<DriveFile> {
    const params = new URLSearchParams({ uploadType: "media", fields: FILE_FIELDS });
    return this.request<DriveFile>(`${UPLOAD_URL}/${id}?${params}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: content,
    });
  }

  async stat(id: string): Promise<DriveFile | null> {
    const token = await this.getToken();
    const res = await fetch(`${FILES_URL}/${id}?fields=${FILE_FIELDS}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw await driveError(res);
    }
    return res.json() as Promise<DriveFile>;
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      throw await driveError(res);
    }
    return res.json() as Promise<T>;
  }
}

const MULTIPART_BOUNDARY = "ht2-boundary";

function multipart(metadata: object, content: string): string {
  return [
    `--${MULTIPART_BOUNDARY}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${MULTIPART_BOUNDARY}`,
    "Content-Type: application/json",
    "",
    content,
    `--${MULTIPART_BOUNDARY}--`,
    "",
  ].join("\r\n");
}

async function driveError(res: Response): Promise<Error> {
  let detail = "";
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    detail = body.error?.message ?? "";
  } catch {
    // body was not JSON; fall back to the status text
  }
  return new Error(`Drive request failed (${res.status})${detail ? `: ${detail}` : ""}`);
}
