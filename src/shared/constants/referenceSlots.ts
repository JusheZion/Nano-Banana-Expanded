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
