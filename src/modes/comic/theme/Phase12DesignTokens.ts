/**
 * Phase 12 Design System: 60/30/10 ratio
 * Primary (60%) Royal Blue Jewel, Secondary (30%) Warm Cream, Accent (10%) Glitter Gold
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
