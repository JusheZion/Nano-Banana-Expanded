/**
 * Hero + landing backdrop rotation (see `LandingPage.tsx`).
 *
 * How to add images (step-by-step):
 * 1. Put files in `public/assets/images/hero/` (JPG/PNG/WebP). Avoid spaces in filenames or use `%20` in URLs.
 * 2. Append its public-directory path below without a leading slash.
 * 3. Optionally set `LANDING_HERO_FALLBACK_URL` to your preferred default.
 * 4. Run `npm run dev` and open home — rotation interval ~14s; do not use `dist/` paths in source.
 *
 * Longer instructions: `public/assets/images/hero/README.txt` and walkthrough “Landing hero images”.
 */
import { publicAssetUrl } from './viteAssets';

const LANDING_HERO_ROTATION_PATHS = [
  'assets/images/Aries%20Approaches%20the%20Observatory.png',
  'assets/images/City%20of%20Aquarius.jpg',
  'assets/images/Aries%20Palace.jpg',
  'assets/images/Aquarius%20Sphere.jpg',
] as const;

export const LANDING_HERO_ROTATION_URLS: readonly string[] =
  LANDING_HERO_ROTATION_PATHS.map((path) => publicAssetUrl(path));

export const LANDING_HERO_FALLBACK_URL =
  publicAssetUrl('assets/images/Aries%20Approaches%20the%20Observatory.png');
