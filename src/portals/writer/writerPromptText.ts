const TRUNCATION_MARKER = '\n\n…(truncated)';

export function truncateWriterPromptText(raw: string, cap: number): string {
  if (cap <= 0) return '';

  const text = raw.trim();
  if (!text || text.length <= cap) return text;
  if (TRUNCATION_MARKER.length >= cap) return TRUNCATION_MARKER.slice(0, cap);

  return `${text.slice(0, cap - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}`;
}
