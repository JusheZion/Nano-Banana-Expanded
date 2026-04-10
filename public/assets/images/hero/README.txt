Hero images for the ARC Hub landing page (rotating hero panel + full-page backdrop).

The app reads URLs from src/shared/landingHeroRotation.ts — not from this folder automatically.
You must add files here AND list each URL in that file.

Step-by-step
------------
1. Copy your image files into this folder:
   public/assets/images/hero/
   Use JPG, PNG, or WebP. Prefer short names without spaces (e.g. hero-aquarius.webp), or plan to URL-encode spaces in step 3.

2. Do NOT reference dist/ or build output. Vite serves everything under public/ at the site root. After npm run build, those same files appear under dist/ automatically — you never hand-edit dist/.

3. Open: src/shared/landingHeroRotation.ts

4. Add one string per image to LANDING_HERO_ROTATION_URLS. Each path starts at the web root:
   '/assets/images/hero/your-file.webp'
   If the filename has spaces or special characters, use percent-encoding:
   '/assets/images/hero/My%20Photo.jpg'

5. (Optional) Set LANDING_HERO_FALLBACK_URL to the same path as your favorite slide — used when the rotation list is empty or as a stable default.

6. Save, run npm run dev (or npm run build), open the app home / ARC Hub. The hero and backdrop advance on a timer (~14s); move the mouse over the hero for parallax (unless prefers-reduced-motion).

Ship note: The repo may still list legacy paths under /assets/images/ (not this folder) until you replace them with dedicated hero assets.
