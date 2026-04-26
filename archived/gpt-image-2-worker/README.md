## Archived: GPT Image 2 via Cloudflare Worker (disabled)

This directory contains the Cloudflare Worker proof-of-concept for OpenAI **GPT Image 2**.

It is intentionally **not active** in the current build:

- `wrangler.jsonc` no longer sets `"main": "worker/index.ts"` and no longer binds the R2 bucket.
- The app is running in **Gemini-only** mode for image generation.

### If re-enabling later

1. Restore `wrangler.jsonc`:
   - Add `"main": "worker/index.ts"`
   - Add R2 binding for `IMAGESHOP_BUCKET` (e.g. bucket `imageshop-imports`)
2. Move `archived/gpt-image-2-worker/index.ts` back to `worker/index.ts`
3. Re-add any client wiring (upload refs + `/api/image/generate` wrapper + UI provider toggle) if it was removed.
4. Set the Worker secret:
   - `wrangler secret put OPENAI_API_KEY`

