export function parseJsonFromModel<T>(raw: string): T | null {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
