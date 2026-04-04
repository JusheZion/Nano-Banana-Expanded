import { describe, expect, it } from 'vitest';
import { shotPlanJsonToCsv } from '@/portals/writer/shotPlanCsv';

describe('shotPlanJsonToCsv', () => {
  it('outputs header and rows with escaped commas', () => {
    const csv = shotPlanJsonToCsv({
      shots: [
        {
          shot_index: 1,
          scene_ref: 'p3',
          shot_type: 'wide',
          description: 'Hello, world',
          duration_seconds: 2,
          audio_notes: 'none',
        },
      ],
    });
    expect(csv).toContain('shot_index,scene_ref,shot_type,description,duration_seconds,audio_notes');
    expect(csv).toContain('"Hello, world"');
    expect(csv).toContain('1,p3,wide');
  });

  it('handles missing shots array', () => {
    const csv = shotPlanJsonToCsv({});
    expect(csv.split('\r\n').length).toBe(1);
    expect(csv).toMatch(/^shot_index,/);
  });
});
