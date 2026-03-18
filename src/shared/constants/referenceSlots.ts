/**
 * Reference image slot categories and ranges for ARCS (14 slots total).
 * Physicality 0–3, Hairstyle 4–6, Clothing 7–10, Aesthetic 11–13.
 */
export const REFERENCE_SLOT_CATEGORIES = [
  { name: 'Physicality', start: 0, end: 3 },   // 4 slots
  { name: 'Hairstyle', start: 4, end: 6 },     // 3 slots
  { name: 'Clothing', start: 7, end: 10 },     // 4 slots
  { name: 'Aesthetic', start: 11, end: 13 },  // 3 slots
] as const;

export const REFERENCE_SLOT_COUNT = 14;

/**
 * DNA grouping for UI and API role labeling:
 * Slots 1–4 (0–3): Character DNA (Identity/Face)
 * Slots 5–10 (4–9): Wardrobe DNA (Clothing/Accessories)
 * Slots 11–14 (10–13): Atmospheric DNA (Lighting/Vibe)
 */
export const REFERENCE_SLOT_DNA_GROUPS = [
  { id: 'identity', label: 'Character DNA', subtitle: 'Identity/Face', start: 0, end: 3 },
  { id: 'style', label: 'Wardrobe DNA', subtitle: 'Clothing/Accessories', start: 4, end: 9 },
  { id: 'composition', label: 'Atmospheric DNA', subtitle: 'Lighting/Vibe', start: 10, end: 13 },
] as const;

export type ReferenceSlotRole = 'identity' | 'style' | 'composition';

/**
 * Returns the API role for the given slot index (0–13).
 */
export function getSlotRole(index: number): ReferenceSlotRole {
  if (index >= 0 && index <= 3) return 'identity';
  if (index >= 4 && index <= 9) return 'style';
  if (index >= 10 && index <= 13) return 'composition';
  return 'identity';
}

/**
 * Returns the DNA group label for the given slot index.
 */
export function getSlotDnaGroupLabel(index: number): string {
  const group = REFERENCE_SLOT_DNA_GROUPS.find((g) => index >= g.start && index <= g.end);
  return group ? group.label : 'Reference';
}

/**
 * Returns a human-readable label for the given slot index (0–13).
 * e.g. 0 → "Physicality 1", 4 → "Hairstyle 1", 11 → "Aesthetic 1".
 */
export function getSlotLabel(index: number): string {
  if (index < 0 || index >= REFERENCE_SLOT_COUNT) {
    return `Slot ${index}`;
  }
  const cat = REFERENCE_SLOT_CATEGORIES.find(
    (c) => index >= c.start && index <= c.end
  );
  if (!cat) return `Slot ${index}`;
  const oneBased = index - cat.start + 1;
  return `${cat.name} ${oneBased}`;
}
