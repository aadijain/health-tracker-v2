/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth client ID used for Drive sign-in. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
