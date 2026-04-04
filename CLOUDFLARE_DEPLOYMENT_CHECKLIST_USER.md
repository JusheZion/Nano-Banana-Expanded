# Cloudflare Pages deployment — your checklist

Use this while the app repo is updated for production (SPA routing, env docs, etc.). Check boxes as you complete each step. If a step does not apply, mark it N/A and note why.

**Related plan:** Writers’ Workshop UX roadmap (Cursor plan) — section 7 covers Cloudflare; engineering tasks include `public/_redirects` and build verification.

---

## A. Accounts and access

- [x] **A2.** I can sign in to Cloudflare and see the dashboard.
- [x] **A3.** I have access to the **Git** host where this repo lives (e.g. GitHub) and permission to install the Cloudflare GitHub App / connect the repository.
- [x] **A4.** I have access to the **Supabase** project dashboard for this app (same project I use locally with `VITE_SUPABASE_URL` / anon key).

---

## B. Prepare values before Cloudflare (copy/paste notes)

Complete these so you are not hunting mid-setup.

- [x] **B1.** Open my local [`.env`](.env) (or `.env.example` for names only — **never commit real secrets**).
- [x] **B2.** Copy **`VITE_SUPABASE_URL`** to a scratch note (looks like `https://xxxx.supabase.co`).
- [x] **B3.** Copy **`VITE_SUPABASE_ANON_KEY`** to a password manager or secure note (this is the **anon** public key, not the service role).
- [x] **B4.** List any **other** variables my app uses that start with `VITE_` (grep the repo or ask the dev). I will add each one in Cloudflare Pages.

---

## C. Git repository state

- [x] **C1.** Latest code is **pushed** to the branch Cloudflare will build (usually `main` or `feat/...` — I know which branch I will select in Pages).
- [x] **C2.** I confirmed with the dev that **`public/_redirects`** exists (or will exist before go-live) with SPA fallback:

  ```text
  /*    /index.html   200
  ```

  *Without this, refreshing the browser on a non-home URL may show a 404.*

- [x] **C3.** I ran **`npm run build`** locally once (optional but recommended). It finished without errors and produced a **`dist/`** folder.

---

## D. Create the Cloudflare Pages project

- [x] **D1.** In Cloudflare: **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
- [x] **D2.** I authorized Cloudflare to access my Git provider and **selected this repository**.
- [x] **D3.** I selected the **production branch** that actually contains the features I expect (often **`main`**). If development happened on another branch (e.g. **`feat/writers-workshop`**) and was **never merged** into `main`, Pages will build **old** `main` — missing newer portals until you **change the production branch** in Pages settings or **merge** to `main`.
- [x] **D4.** Build settings (adjust only if the UI suggests something wrong):

  | Field | Value |
  |--------|--------|
  | Framework preset | **Vite** (or None — both work if commands are correct) |
  | Build command | `npm run build` |
  | Build output directory | `dist` |
  | Root directory | `/` (repo root) |

- [x] **D4b. Workers + Wrangler deploy (this repo):** If Cloudflare runs **`npx wrangler versions upload`** (or **`wrangler deploy`**) after install, the **build** step must run **`npm run build` first** so **`dist/`** exists. Repo [`wrangler.jsonc`](wrangler.jsonc) sets **`assets.directory`** to **`dist`** and **`not_found_handling`**: **`single-page-application`** — without **`directory`**, Wrangler fails with *“assets … missing the required directory property”*. Do **not** rely on **New deployment → upload files** for this app; use **Git push** / retry on a **Git-sourced** build.

- [x] **D4c. Local terminal — `wrangler` “not a command”:** There is no shell command named **`versions upload`**. Wrangler is the **`wrangler`** CLI; **`versions upload`** is two nested subcommands. From the **repo root** (after **`npm install`**), use **`npx`** so Node resolves the local **`node_modules`** binary:
  - **Recommended:** **`npm run deploy`** — runs **`npm run build`** then **`wrangler deploy`**.
  - **If `dist/` is already built:** **`npx wrangler deploy`**
  - **Same as many CI logs:** **`npx wrangler versions upload`** (not a separate top-level `versions` command).
  If you type **`wrangler`** without **`npx`** and without a global install, the shell will report **command not found**.

- [x] **D4d. Workers + Git (dashboard like “Build command / Deploy command”):** If Cloudflare shows **Workers** connected to **GitHub** (not Pages), the dashboard has a **Build command** and a **Deploy command**. For this Vite repo, **`Build command` must not be `None`**. Wrangler reads **`assets.directory`**: **`dist`** in [`wrangler.jsonc`](wrangler.jsonc) — that folder is **created only** by **`npm run build`**. Recommended settings (repo root **`/`**):
  - **Build command:** **`npm ci && npm run build`** (or **`npm install && npm run build`** if **`npm ci`** fails without a lockfile).
  - **Deploy command:** **`npx wrangler deploy`** (matches [`package.json`](package.json) **`deploy`** script’s second half).
  - **Production branch:** **`main`** (must match where you push).
  If **Build command** stays **`None`**, the checkout has **no `dist/`**, deploy fails or stays stale, and the UI shows **“Your last build failed.”**  
  **Static assets only** on the Worker is **expected** for this SPA — there is no Worker script, only uploaded **`dist/`** files. **`VITE_*`** values are baked in at **build** time; add them under the **build / CI environment variables** for this Worker’s Git builds (Cloudflare’s UI may label this **Variables** on the **Build** configuration, not “Worker secrets”). Without them, the app may build but show blank / missing Supabase in production.

- [x] **D5.** I clicked **Save and Deploy** (or equivalent) and waited for the first build to finish.

---

## E. Fix a failed build (only if needed)

- [ ] **E1.** I opened the **failed deployment** log in Cloudflare and read the error at the bottom.
- [ ] **E2.** Common fixes I tried (check any that applied):

  - [ ] **Node version:** In Pages → **Settings** → **Environment variables** → add **`NODE_VERSION`** = `20` (or `22`), then **Retry deployment**.
  - [ ] **Install command:** If the build skipped `npm ci`, set **Environment variable** or build setting so dependencies install (often automatic for `npm run build`).
  - [ ] **Wrong output folder:** Confirm output is **`dist`**, not `build` or `public`.
  - [ ] **Wrangler `assets.directory`:** If the log shows Wrangler after **`npm ci`** only, set **build command** to **`npm run build`** (or ensure a separate build step runs before **`wrangler versions upload`**). Confirm **`wrangler.jsonc`** includes **`assets.directory`**: **`dist`**.
  - [ ] **Local: `wrangler` not found:** Use **`npm run deploy`** or **`npx wrangler deploy`** from the repo root (see **D4c**). The Cloudflare log phrase **`wrangler versions upload`** means run **`npx wrangler versions upload`**, not **`versions upload`** alone.

- [ ] **E3.** Build is now **Success** and I have a **`.pages.dev` URL** (e.g. `https://my-app.pages.dev`).

---

## F. Environment variables on Cloudflare Pages

Variables must be set in **Cloudflare**, not only in `.env` on your laptop. Vite only embeds vars that start with **`VITE_`** at **build** time.

- [x] **F1.** Pages project → **Settings** → **Environment variables** (or **Variables and Secrets**).
- [x] **F2.** Under **Production**, I added:

  - [x] `VITE_SUPABASE_URL` = (my Supabase project URL)
  - [x] `VITE_SUPABASE_ANON_KEY` = (my anon key)
  - [x] Any other `VITE_*` keys the app needs

- [ ] **F3.** I repeated the same for **Preview** (branch/PR builds), *or* I accept that previews may be broken until I duplicate vars — **Preview** is optional for first launch.

- [ ] **F4.** I triggered a **new deployment** after saving variables (Cloudflare often offers “Retry deployment” or an empty commit — builds must run **after** vars exist so Vite can bake them in).

---

## G. Verify the live site (before custom domain)

- [ ] **G1.** I opened the **`*.pages.dev`** URL in a normal browser window.
- [ ] **G2.** The app **loads** (no blank white screen; check DevTools **Console** for missing env errors).
- [ ] **G3.** I navigated inside the app, then **refreshed the page**. It still loads (tests SPA `_redirects`).
- [ ] **G4.** I tried **Writers’ Workshop** (or another heavy route) and refresh again — still OK.

---

## H. Supabase Auth URLs (required for sign-in on production)

Replace `https://YOUR-PAGES-DEV-URL` with your real URL (no trailing slash unless Supabase accepts it — usually **no** trailing slash).

- [ ] **H1.** Supabase dashboard → **Authentication** → **URL Configuration**.
- [ ] **H2.** **Site URL** set to: `https://YOUR-PAGES-DEV-URL` (production entry point users land on after auth).
- [ ] **H3.** **Redirect URLs** includes **all** of:

  - [ ] `http://localhost:5173` (Vite dev — keep for local work)
  - [ ] `http://127.0.0.1:5173` (optional but helpful)
  - [ ] `https://YOUR-PAGES-DEV-URL`
  - [ ] `https://YOUR-PAGES-DEV-URL/**` if Supabase UI allows wildcard patterns (follow current Supabase docs for exact syntax)
  - [ ] Each **Preview** URL I care about (e.g. `https://branch-name.project.pages.dev`) — optional

- [ ] **H4.** I clicked **Save** in Supabase.

---

## I. Google sign-in only (skip if not using Google yet)

- [ ] **I1.** Supabase → **Authentication** → **Providers** → **Google** is enabled with Client ID / Secret.
- [ ] **I2.** Google Cloud Console → **APIs & Services** → **Credentials** → my OAuth client → **Authorized redirect URIs** includes:

  `https://<project-ref>.supabase.co/auth/v1/callback`

  (Use my real project ref from Supabase URL.)

- [ ] **I3.** I tested **Continue with Google** on **production URL** and landed back in the app signed in.

---

## J. Custom domain (optional)

- [ ] **J1.** Cloudflare Pages → my project → **Custom domains** → **Set up a custom domain**.
- [ ] **J2.** I followed DNS instructions (often **CNAME** to the target Pages shows).
- [ ] **J3.** SSL shows **Active** (can take a few minutes).
- [ ] **J4.** I updated Supabase **Site URL** and **Redirect URLs** to use **`https://mydomain.com`** (not only `pages.dev`).
- [ ] **J5.** I redeployed or retried auth after DNS propagated.

---

## K. Supabase Edge Functions (writer-tools, etc.)

Hosting on Cloudflare does **not** deploy Edge Functions — they stay on **Supabase**.

- [ ] **K1.** I confirmed **`writer-tools`** (and any others) are **deployed** on the same Supabase project: `supabase functions deploy writer-tools` (or Dashboard).
- [ ] **K2.** Required **secrets** exist in Supabase for those functions (the dev maintains the list).
- [ ] **K3.** From the **live Cloudflare URL**, I signed in and ran an action that calls **writer-tools**; Network tab shows **200** (not 401/500).

---

## L. Data, backups, and expectations

- [ ] **L1.** I understand **Writer’s Room data** lives in **Supabase Postgres** when the app is configured — not “inside Cloudflare.”
- [ ] **L2.** Deploying to Cloudflare **does not delete** Supabase data if I use the **same** `VITE_SUPABASE_URL` / project as local.
- [ ] **L3.** I know **open RLS** (`USING (true)`) means data is **not** private per user until a future migration; I will not put highly sensitive content in writer tables until then.
- [ ] **L4.** (Optional) I exported a backup from Supabase **SQL Editor** or Table Editor before major changes (CSV/SQL dump of `writer_*` tables).

---

## M. Final sign-off

- [ ] **M1.** Production URL bookmarked: _________________________________
- [ ] **M2.** Supabase Site URL matches that origin: **Yes / No**
- [ ] **M3.** Sign-in + one critical workflow tested on production: **Yes / No**
- [ ] **M4.** Notes / blockers for the dev:

---

## Merge conflicts after a PR (why “JSON error” comes back)

GitHub can show **Merge pull request** as available, but the merge still has to **apply cleanly** or you resolve conflicts locally / on GitHub. If anything goes wrong, **leftover conflict markers** (`<<<<<<<`, `=======`, `>>>>>>>`) stay in files. **`package.json` with those markers is not valid JSON** — `npm` and Cloudflare report **`EJSONPARSE` / JSON parse** errors. That is not a mysterious regression; it means the merge was not finished.

**What to do every time you see conflicts**

1. **Search the repo** for `<<<<<<<` (Source Control search or IDE “Find in files”). **Every** file with markers must be fixed before you commit — especially **`package.json`**, **`package-lock.json`**, tests, and **`walkthrough.md`**.
2. In **`package.json`**, do **not** use **Accept both changes** — that often produces **two** `scripts` blocks or **two** roots and still breaks JSON. Pick **one** coherent file: usually **keep your branch’s** `scripts` (`build`, `preview`, `deploy`, `wrangler`) **plus** any **new dependencies** from `main` that you actually need, then hand-merge into a **single** valid object.
3. **Delete** every line that is only a marker (`<<<<<<< …`, `=======`, `>>>>>>> …`).
4. **Verify before push:** from repo root run:
   - `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"`
   - `npm run build`
5. Commit the **resolved** files (no markers left), push, then let Cloudflare rebuild.

**Why it looks like “only indentation changed”**

On **`walkthrough.md`** (and sometimes TS), both sides edited the **same paragraphs**. Git marks a big block as conflict even when the only visible difference is spaces or heading level. You still must **remove markers** and keep **one** version of the text, then save.

**Reduce repeats**

- Before opening or merging a PR: **`git fetch origin`** and **`git merge origin/main`** (or rebase) **on your feature branch**, fix conflicts **there**, run **`npm run build`**, then merge to `main`. That way `main` usually stays clean.
- After resolving, open **`package.json`** in a raw view and confirm there is **exactly one** opening `{` at the top and **exactly one** closing `}` at the bottom — no duplicate `"name"` keys.

---

## Quick troubleshooting

| Symptom | Things to check |
|--------|------------------|
| Blank app, console mentions `undefined` Supabase | `VITE_*` vars missing in Pages **or** deployment ran **before** vars were added — redeploy. |
| 404 on refresh | `public/_redirects` missing or wrong; rebuild and redeploy. |
| Auth redirect loop or “redirect URL not allowed” | Supabase **Redirect URLs** must include exact production origin. |
| Google works locally but not prod | Supabase Site URL + Redirect URLs must include prod; Google redirect URI stays Supabase callback, not Cloudflare. |
| writer-tools 401 | User must be signed in; JWT / Edge function config — coordinate with dev (not Cloudflare-specific). |
| **Writers’ Workshop (or other new work) missing** on the live site but works locally | **Branch mismatch:** Cloudflare is building **`main`** while your work is only on **`feat/...`**. Fix: **Pages → Settings → Builds & deployments → Production branch** → set to the branch that has the feature, **or** open a **PR and merge** into `main`, then redeploy. |
| Build fails: `npm ci` / “**can only install with an existing package-lock.json**” | **Root directory** in Pages must be the folder that contains **`package.json` and `package-lock.json`** together (usually **empty** or **`/`** = repo root). If Root is a subfolder, `npm ci` sees no lockfile. Confirm that commit on GitHub lists **`package-lock.json`** at that path; merge/commit the lockfile if missing. **Also:** open **`package.json`** on that same commit — if a bad merge duplicated half the file, it is **invalid JSON** (GitHub shows red/error or `npm` would report `EJSONPARSE`). Fix the file on **`main`**, run **`npm install`** locally to refresh **`package-lock.json`**, commit, push, redeploy. |
| Wrangler: **`assets` … missing `directory`** / deploy after install only | Set **`assets.directory`** to **`dist`** in **`wrangler.jsonc`** and ensure **build command** runs **`npm run build`** before **`wrangler versions upload`** so **`dist/`** exists. |
| **`EJSONPARSE`** / **JSON** error right after merging a PR | Search for **`<<<<<<<`** — conflict markers are still in **`package.json`** (or another file). Remove all markers; ensure **one** valid JSON object. See **Merge conflicts after a PR** above. |
| **Commit SHA on Cloudflare is older than GitHub `main`** (build not updating) | See **Stale Cloudflare vs GitHub (commit mismatch)** below. |
| **Workers + Git: “Your last build failed”** / SHA never updates | Set **Build command** to **`npm ci && npm run build`** (not **`None`**). See **D4d**. Open **View build** and fix any **`npm ci`** / **`tsc`** / missing **`VITE_*`** errors. |

### Stale Cloudflare vs GitHub (commit mismatch)

Cloudflare shows a **commit hash** (SHA) per deployment. If it is **behind** GitHub:

1. **Production branch** — **Workers & Pages** → your **Pages** project → **Settings** → **Builds & deployments** → **Production branch** must be **`main`** (or whichever branch you actually push to). If it still says **`feat/...`** or an old default, every new push to **`main`** will **not** trigger production.
2. **Latest deployment status** — Open **Deployments**. If the **newest** row is **Failed**, production may still be serving the **last successful** (older) commit. Fix the error in the log, then **Retry deployment** or push a small commit.
3. **Git connection** — **Settings** → confirm the repo is still linked; re-authorize the Cloudflare GitHub App if GitHub prompted for reduced permissions. **Disconnect + reconnect** the repo only if builds stopped entirely.
4. **Wrong project or zone** — Confirm you are in the same Cloudflare account and the same **Pages** project URL you expect (not an old test project).
5. **Workers (not Pages)** — A **Worker** deployed only via **`wrangler deploy`** from a laptop does **not** auto-update when you push to GitHub unless you added a **Git integration** or **CI** that runs Wrangler. Pushes update **Pages**; **Workers** need that pipeline or a manual **`npm run deploy`**.
6. **Force a new build** — After fixing settings: **Deployments** → **Create deployment** → select **`main`** and latest commit, or push an empty commit: `git commit --allow-empty -m "chore: trigger Cloudflare build" && git push`.

---

*Last aligned with repo: Writers’ Workshop roadmap — Cloudflare Pages track.*
