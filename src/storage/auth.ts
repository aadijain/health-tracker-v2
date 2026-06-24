/**
 * Google sign-in via Google Identity Services (GIS) token flow.
 *
 * No server, no refresh tokens: we ask GIS for a short-lived OAuth access token
 * scoped to the user's Drive appDataFolder, hold it in memory, and silently
 * re-request it when it nears expiry. The only secret is the public client ID.
 */

import { DRIVE_SCOPE } from "../config";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface OAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type?: string }) => void;
  }): TokenClient;
  revoke(token: string, done?: () => void): void;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: OAuth2 } };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
/** Refresh a little before the real expiry to avoid using an about-to-die token. */
const EXPIRY_SKEW_MS = 60_000;

/** localStorage key holding the cached access token across page reloads. */
const TOKEN_STORAGE_KEY = "ht2.googleToken";

let scriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (scriptPromise) {
    return scriptPromise;
  }
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export class GoogleAuth {
  private client: TokenClient | null = null;
  private accessToken: string | null = null;
  private expiresAt = 0;
  private pending: { resolve: (token: string) => void; reject: (error: Error) => void } | null =
    null;

  constructor(
    private readonly clientId: string,
    private readonly scope: string = DRIVE_SCOPE,
  ) {
    this.restore();
  }

  get isConfigured(): boolean {
    return this.clientId !== "";
  }

  isConnected(): boolean {
    return this.accessToken !== null && Date.now() < this.expiresAt;
  }

  /** Interactive sign-in: prompts for consent if the user has not granted it. */
  async connect(): Promise<string> {
    return this.requestToken("consent");
  }

  /** A valid access token, silently refreshed if the current one is missing/expired. */
  async ensureToken(): Promise<string> {
    if (this.isConnected() && this.accessToken !== null) {
      return this.accessToken;
    }
    return this.requestToken("");
  }

  disconnect(): void {
    const token = this.accessToken;
    if (token && window.google) {
      window.google.accounts.oauth2.revoke(token);
    }
    this.accessToken = null;
    this.expiresAt = 0;
    this.persist();
  }

  /** Persist the current token so a page refresh stays connected until it expires. */
  private persist(): void {
    try {
      if (this.accessToken && Date.now() < this.expiresAt) {
        localStorage.setItem(
          TOKEN_STORAGE_KEY,
          JSON.stringify({ accessToken: this.accessToken, expiresAt: this.expiresAt }),
        );
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable (private mode); degrade to in-memory only.
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const saved = JSON.parse(raw) as { accessToken?: unknown; expiresAt?: unknown };
      if (typeof saved.accessToken === "string" && typeof saved.expiresAt === "number") {
        this.accessToken = saved.accessToken;
        this.expiresAt = saved.expiresAt;
      }
    } catch {
      // Ignore unreadable/corrupt stored tokens.
    }
  }

  private async requestToken(prompt: string): Promise<string> {
    const client = await this.ensureClient();
    return new Promise<string>((resolve, reject) => {
      this.pending = { resolve, reject };
      client.requestAccessToken({ prompt });
    });
  }

  private async ensureClient(): Promise<TokenClient> {
    if (this.client) {
      return this.client;
    }
    if (!this.isConfigured) {
      throw new Error("Google sign-in is not configured (missing client ID).");
    }
    await loadGisScript();
    const oauth2 = window.google?.accounts.oauth2;
    if (!oauth2) {
      throw new Error("Google sign-in failed to initialise.");
    }
    this.client = oauth2.initTokenClient({
      client_id: this.clientId,
      scope: this.scope,
      callback: (response) => this.handleResponse(response),
      error_callback: (error) =>
        this.pending?.reject(new Error(error.type ?? "Google sign-in was cancelled.")),
    });
    return this.client;
  }

  private handleResponse(response: TokenResponse): void {
    const pending = this.pending;
    this.pending = null;
    if (response.error || !response.access_token) {
      pending?.reject(new Error(response.error ?? "Google sign-in failed."));
      return;
    }
    this.accessToken = response.access_token;
    const lifetimeMs = (response.expires_in ?? 3600) * 1000;
    this.expiresAt = Date.now() + lifetimeMs - EXPIRY_SKEW_MS;
    this.persist();
    pending?.resolve(response.access_token);
  }
}
