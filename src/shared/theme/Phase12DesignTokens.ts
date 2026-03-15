/**
 * ARCS Design System (Phase 12): 60/30/10 ratio
 * Primary (60%) Royal Blue Jewel, Secondary (30%) Warm Cream, Accent (10%) Glitter Gold
 * Single source of truth for ARCS Golden-Blue theme across hub and portals.
 */

/** Primary - Royal Blue Jewel: sidebar and main workspace panels */
export const PRIMARY_BG = 'radial-gradient(circle at center, #002366 0%, #000814 100%)';
export const PRIMARY_BG_FLAT = '#002366';
export const PRIMARY_BG_DARK = '#000814';
/** Lighter/opaque royal blue for icon buttons on blue (e.g. top ribbon non-active) */
export const PRIMARY_BG_LIGHT = 'rgba(0, 35, 102, 0.55)';

/** Secondary - Warm Cream: sub-panels and secondary text */
export const SECONDARY_BG = '#F5F5DC';
export const SECONDARY_TEXT = '#F5F5DC';

/** Accent - Glitter Gold: headers, NEW PROJECT button, active tool selections */
export const ACCENT_GOLD_GRADIENT = 'linear-gradient(45deg, #bf953f 0%, #fcf6ba 45%, #b38728 70%, #fbf5b7 85%, #aa771c 100%)';
/** Solid gold for strokes/borders (e.g. Konva snap lines) */
export const ACCENT_GOLD_SOLID = '#b38728';
export const ACCENT_GOLD_LIGHT = '#fcf6ba';
export const ACCENT_GOLD_DARK = '#aa771c';

/** Text on Gold = Black; Text on Blue = Gold or Cream */
export const TEXT_ON_GOLD = '#000000';
export const TEXT_ON_BLUE = '#fcf6ba'; // gold-tint for readability
export const TEXT_ON_BLUE_ALT = '#F5F5DC'; // cream

/** Golden-Blue system: ribbon and menu theming */
/** Horizontal ribbon area background */
export const ACCENT_BLUE_GRADIENT = 'linear-gradient(135deg, #002366 0%, #003580 45%, #0047a0 70%, #002366 100%)';
/** Text/icons on gold (menu bar, vertical menus) — dark blue for contrast */
export const TEXT_BLUE_GRADIENT = 'linear-gradient(135deg, #001a4d 0%, #002366 50%, #003580 100%)';
/** Optional: slightly subtler gold for top menu bar if desired */
export const MENU_BAR_GOLD_GRADIENT = 'linear-gradient(45deg, #bf953f 0%, #fcf6ba 45%, #b38728 70%, #fbf5b7 85%, #aa771c 100%)';

/** ARCS jewel-tone sidebar: golden at top → deep indigo/purple at bottom */
export const SIDEBAR_JEWEL_GRADIENT = 'linear-gradient(180deg, #f6c453 0%, #f08a5d 15%, #e45da2 40%, #7b5bd5 70%, #24124d 100%)';

/** Phase 15: Slider track (gradient) and tick marks */
export const SLIDER_TRACK_GRADIENT = 'linear-gradient(to right, #1a2a44, #2a4a7c)';
export const SLIDER_TICK_COLOR = 'rgba(255, 215, 0, 0.4)';

/** Reference Character Studio (Master Build v4): Emerald highlight + True Gold metallic */
export const CHARACTER_STUDIO_BG_V4 =
  'linear-gradient(to bottom right, #022c22 0%, #064e3b 40%, #10b981 85%, #d1fae5 100%)';
export const CHARACTER_STUDIO_GOLD_METALLIC =
  'linear-gradient(to bottom, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)';
export const CHARACTER_STUDIO_BG = 'linear-gradient(to bottom, #064e3b 0%, #000000 100%)';
export const CHARACTER_STUDIO_BG_TAILWIND = 'from-emerald-900 to-black';
export const CHARACTER_STUDIO_ACCENT = 'linear-gradient(to bottom, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)';
export const CHARACTER_STUDIO_CHIP_ACTIVE = 'linear-gradient(to bottom, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)';
/** Emerald gradient for header title text (on gold strip) */
export const CHARACTER_STUDIO_EMERALD_TEXT =
  'linear-gradient(135deg, #064e3b 0%, #059669 40%, #10b981 70%, #6ee7b7 100%)';

/** Asset Reference Studio: Amethyst highlight + same True Gold metallic */
export const ASSET_STUDIO_BG =
  'linear-gradient(to bottom right, #2e1065 0%, #5b21b6 40%, #8b5cf6 85%, #ede9fe 100%)';
/** Amethyst gradient for header title text (on gold strip) */
export const ASSET_STUDIO_AMETHYST_TEXT =
  'linear-gradient(135deg, #2e1065 0%, #5b21b6 40%, #7c3aed 70%, #a78bfa 100%)';

/** Gemstone Pulse (Generate button loading): CSS variable hooks for theming */
export const GEM_EMERALD = '#10b981';
export const GEM_AMETHYST = '#8b5cf6';
