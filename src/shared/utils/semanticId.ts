/**
 * Semantic ID generation for Character and Asset records.
 * Format: CHAR_[NAME]_[01] or ASST_[NAME]_[01]; suffix increments if id exists.
 */

const SLUG_REGEX = /[^a-z0-9]+/gi;

function slugify(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'unknown';
  const slug = trimmed
    .replace(SLUG_REGEX, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 32);
  return slug || 'UNKNOWN';
}

/**
 * Generate a unique semantic id for a character or asset.
 * @param prefix - 'CHAR' or 'ASST'
 * @param baseName - display name or label (e.g. "Hero", "Room Ref")
 * @param existingIds - list of ids already in use (e.g. from DB)
 * @returns id like CHAR_HERO_01 or ASST_ROOM_REF_02
 */
export function generateSemanticId(
  prefix: 'CHAR' | 'ASST',
  baseName: string,
  existingIds: string[]
): string {
  const base = slugify(baseName);
  const set = new Set(existingIds);
  let suffix = 1;
  let candidate: string;
  do {
    candidate = `${prefix}_${base}_${String(suffix).padStart(2, '0')}`;
    suffix += 1;
  } while (set.has(candidate));
  return candidate;
}
