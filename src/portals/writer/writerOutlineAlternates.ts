export type WriterOutlineAlternate = {
  at: string;
  treatmentMode: 'preserve' | 'structure' | 'expand';
  proposal: Record<string, unknown>;
};

export function readOutlineAlternates(notes: unknown): WriterOutlineAlternate[] {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return [];
  const value = (notes as Record<string, unknown>).outline_alternates;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WriterOutlineAlternate => (
    Boolean(item)
    && typeof item === 'object'
    && !Array.isArray(item)
    && typeof (item as WriterOutlineAlternate).at === 'string'
    && ['preserve', 'structure', 'expand'].includes((item as WriterOutlineAlternate).treatmentMode)
    && Boolean((item as WriterOutlineAlternate).proposal)
    && typeof (item as WriterOutlineAlternate).proposal === 'object'
    && !Array.isArray((item as WriterOutlineAlternate).proposal)
  )).slice(-10);
}

export function mergeOutlineAlternateIntoNotes(
  notes: unknown,
  alternate: WriterOutlineAlternate,
): Record<string, unknown> {
  const next = notes && typeof notes === 'object' && !Array.isArray(notes)
    ? { ...(notes as Record<string, unknown>) }
    : {};
  next.outline_alternates = [...readOutlineAlternates(notes), alternate].slice(-10);
  return next;
}
