import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SyncEngine } from "./sync";
import type { DriveClient, DriveFile } from "./types";

/** In-memory DriveClient with controllable timestamps and failure injection. */
class FakeDrive implements DriveClient {
  private clock = 0;
  private store = new Map<string, { name: string; content: string; modifiedTime: string }>();
  creates = 0;
  updates = 0;
  failNextWrite = false;

  private stamp(): string {
    this.clock += 1;
    return `t${this.clock}`;
  }

  async find(name: string): Promise<DriveFile | null> {
    for (const [id, f] of this.store) {
      if (f.name === name) {
        return { id, modifiedTime: f.modifiedTime };
      }
    }
    return null;
  }

  async download(id: string): Promise<string> {
    const f = this.store.get(id);
    if (!f) {
      throw new Error("not found");
    }
    return f.content;
  }

  async create(name: string, content: string): Promise<DriveFile> {
    this.maybeFail();
    this.creates += 1;
    const id = `file-${this.store.size + 1}`;
    const modifiedTime = this.stamp();
    this.store.set(id, { name, content, modifiedTime });
    return { id, modifiedTime };
  }

  async update(id: string, content: string): Promise<DriveFile> {
    this.maybeFail();
    this.updates += 1;
    const f = this.store.get(id);
    if (!f) {
      throw new Error("not found");
    }
    f.content = content;
    f.modifiedTime = this.stamp();
    return { id, modifiedTime: f.modifiedTime };
  }

  async stat(id: string): Promise<DriveFile | null> {
    const f = this.store.get(id);
    return f ? { id, modifiedTime: f.modifiedTime } : null;
  }

  private maybeFail(): void {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("network down");
    }
  }

  // --- test helpers ---
  seed(name: string, content: string): string {
    const id = `file-${this.store.size + 1}`;
    this.store.set(id, { name, content, modifiedTime: this.stamp() });
    return id;
  }

  /** Simulate an edit from another device. */
  touch(id: string): void {
    const f = this.store.get(id);
    if (f) {
      f.modifiedTime = this.stamp();
    }
  }

  contentOf(id: string): string | undefined {
    return this.store.get(id)?.content;
  }
}

const FILE = "health-tracker.json";
let drive: FakeDrive;
let engine: SyncEngine;

beforeEach(() => {
  drive = new FakeDrive();
  engine = new SyncEngine(drive, { filename: FILE, debounceMs: 10 });
});

describe("load", () => {
  it("returns null and stays unbound when no file exists", async () => {
    expect(await engine.load()).toBeNull();
    expect(engine.hasRemoteFile).toBe(false);
  });

  it("downloads existing content and reports synced", async () => {
    drive.seed(FILE, '{"hello":1}');
    expect(await engine.load()).toBe('{"hello":1}');
    expect(engine.hasRemoteFile).toBe(true);
    expect(engine.status).toBe("synced");
  });
});

describe("queue + flush", () => {
  it("creates the file on first save and clears pending", async () => {
    engine.queue('{"a":1}');
    await engine.flush();
    expect(drive.creates).toBe(1);
    expect(await drive.find(FILE)).not.toBeNull();
    expect(engine.hasPendingChanges).toBe(false);
    expect(engine.status).toBe("synced");
  });

  it("coalesces rapid edits into a single debounced write", async () => {
    vi.useFakeTimers();
    try {
      engine.queue('{"v":1}');
      engine.queue('{"v":2}');
      engine.queue('{"v":3}');
      await vi.runAllTimersAsync();
    } finally {
      vi.useRealTimers();
    }
    expect(drive.creates).toBe(1);
    const file = await drive.find(FILE);
    expect(drive.contentOf(file?.id ?? "")).toBe('{"v":3}');
  });

  it("updates an already-bound file rather than creating", async () => {
    const id = drive.seed(FILE, "{}");
    await engine.load();
    engine.queue('{"x":1}');
    await engine.flush();
    expect(drive.creates).toBe(0);
    expect(drive.updates).toBe(1);
    expect(drive.contentOf(id)).toBe('{"x":1}');
  });
});

describe("conflict guard", () => {
  it("withholds the write when Drive changed elsewhere", async () => {
    const id = drive.seed(FILE, "{}");
    await engine.load();
    drive.touch(id); // external edit after our load
    engine.queue('{"mine":1}');
    await engine.flush();
    expect(engine.status).toBe("conflict");
    expect(engine.hasPendingChanges).toBe(true);
    expect(drive.contentOf(id)).toBe("{}"); // not clobbered
  });

  it("overwrite() forces our content over the conflict", async () => {
    const id = drive.seed(FILE, "{}");
    await engine.load();
    drive.touch(id);
    engine.queue('{"mine":1}');
    await engine.flush();
    expect(engine.status).toBe("conflict");
    await engine.overwrite();
    expect(engine.status).toBe("synced");
    expect(drive.contentOf(id)).toBe('{"mine":1}');
  });

  it("reload() discards local pending and re-downloads", async () => {
    const id = drive.seed(FILE, "{}");
    await engine.load();
    drive.touch(id);
    engine.queue('{"mine":1}');
    await engine.flush();
    expect(engine.status).toBe("conflict");
    expect(await engine.reload()).toBe("{}");
    expect(engine.hasPendingChanges).toBe(false);
  });
});

describe("offline degradation", () => {
  it("keeps pending content on failure and retries successfully", async () => {
    drive.failNextWrite = true;
    engine.queue('{"a":1}');
    await engine.flush();
    expect(engine.status).toBe("offline");
    expect(engine.hasPendingChanges).toBe(true);

    await engine.flush(); // retry
    expect(engine.status).toBe("synced");
    expect(engine.hasPendingChanges).toBe(false);
    expect(drive.creates).toBe(1);
  });
});

describe("status notifications", () => {
  it("emits status transitions", async () => {
    const seen: string[] = [];
    engine.onStatus = (s) => seen.push(s);
    engine.queue("{}");
    await engine.flush();
    expect(seen).toEqual(["syncing", "synced"]);
  });
});

afterEach(() => {
  vi.useRealTimers();
});
