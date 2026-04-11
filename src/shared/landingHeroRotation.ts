/**
 * Hero + landing backdrop rotation (see `LandingPage.tsx`).
 *
 * How to add images (step-by-step):
 * 1. Put files in `public/assets/images/hero/` (JPG/PNG/WebP). Avoid spaces in filenames or use `%20` in URLs.
 * 2. Append each URL string below as `/assets/images/hero/your-file.webp` (site root = Vite `public/`).
 * 3. Optionally set `LANDING_HERO_FALLBACK_URL` to your preferred default.
 * 4. Run `npm run dev` and open home — rotation interval ~14s; do not use `dist/` paths in source.
 *
 * Longer instructions: `public/assets/images/hero/README.txt` and walkthrough “Landing hero images”.
 */
export const LANDING_HERO_ROTATION_URLS: readonly string[] = [
  '/assets/images/Aries%20Approaches%20the%20Observatory.png',
  '/assets/images/City%20of%20Aquarius.jpg',
  '/assets/images/Aries%20Palace.jpg',
  '/assets/images/Aquarius%20Sphere.jpg',
];

export const LANDING_HERO_FALLBACK_URL =
  '/assets/images/Aries%20Approaches%20the%20Observatory.png';
