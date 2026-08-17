/// <reference types="vite/client" />

declare module '*.md?raw' {
  const src: string;
  export default src;
}

/**
 * Vite's own `ImportMetaEnv` is indexed as `[key: string]: any`, so every
 * `import.meta.env.VITE_*` read was implicitly `any` — misspellings compiled fine and call sites
 * had to cast (`as string | undefined`) to get any safety back. Declaring the app's variables here
 * makes them `string | undefined` and makes typos a compile error.
 *
 * Anything listed here is inlined into the client bundle at build time and is therefore public.
 * Server-only secrets (e.g. the Edge Function's GEMINI_API_KEY) must never be given a VITE_ prefix.
 */
interface ImportMetaEnv {
  /** Supabase project URL. Absent => the app falls back to localStorage persistence. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/publishable key. Absent => the app falls back to localStorage persistence. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Gemini API key for browser-side image + text generation. */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
