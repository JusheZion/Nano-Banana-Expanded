/** Minimal typings for Deno globals used by Supabase Edge Functions (IDE / tsc only; Deno provides real types at runtime). */
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get(key: string): string | undefined };
};
