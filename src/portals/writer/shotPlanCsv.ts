/** Escape a cell for RFC-style CSV (Excel-friendly). */
function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  return escapeCsvCell(String(v));
}

/**
 * Build CSV from `writer_video_shot_plans.shot_plan_json` (expects `shots` array).
 */
export function shotPlanJsonToCsv(shotPlanJson: Record<string, unknown>): string {
  const shotsRaw = shotPlanJson.shots;
  const shots = Array.isArray(shotsRaw) ? shotsRaw : [];
  const headers = [
    'shot_index',
    'scene_ref',
    'shot_type',
    'description',
    'duration_seconds',
    'audio_notes',
  ] as const;
  const lines = [headers.join(',')];
  for (const row of shots) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    lines.push(
      [
        cell(o.shot_index),
        cell(o.scene_ref),
        cell(o.shot_type),
        cell(o.description),
        cell(o.duration_seconds),
        cell(o.audio_notes),
      ].join(','),
    );
  }
  return lines.join('\r\n');
}
