import { describe, expect, it } from 'vitest';
import type { PageBeatsJson } from '@/shared/writer/types';
import {
  WRITER_AUDIT_MODE_OPTIONS,
  WRITER_PRODUCTION_BRANCH_OPTIONS,
  summarizePageBeatMetadata,
} from '../writerProductionBranches';

describe('writerProductionBranches', () => {
  it('exports the expected audit mode option definitions', () => {
    expect(WRITER_AUDIT_MODE_OPTIONS).toEqual([
      { id: 'continuity', label: 'Continuity' },
      { id: 'emotional_arc', label: 'Emotional arc' },
      { id: 'character_utilization', label: 'Character utilization' },
      { id: 'worldbuilding_density', label: 'Worldbuilding density' },
    ]);
  });

  it('exports the expected production branch option definitions', () => {
    expect(WRITER_PRODUCTION_BRANCH_OPTIONS).toEqual([
      { id: 'visual_prep', label: 'Visual prep' },
      { id: 'dialogue', label: 'Dialogue' },
      { id: 'exports', label: 'Exports' },
      { id: 'guided_comics_handoff', label: 'Guided Comics handoff' },
    ]);
  });

  it('summarizes page-level metadata into short display strings', () => {
    const beats = {
      one_line_hook: 'Mara finds the observatory door open.',
      key_characters: ['Mara', 'Sol', 'Mara', 'The Lantern Keeper'],
      key_locations: 'Sky Observatory, Archive Bridge',
      art_style: 'high-contrast ink with cyan rim light',
      panels: [{ action: 'Mara studies the open door.' }],
    } satisfies PageBeatsJson & {
      key_characters: string[];
      key_locations: string;
      art_style: string;
    };

    expect(summarizePageBeatMetadata(beats)).toEqual({
      characters: 'Mara, Sol, The Lantern Keeper',
      locations: 'Sky Observatory, Archive Bridge',
      artStyle: 'high-contrast ink with cyan rim light',
    });
  });

  it('uses fallback display text when page-level metadata is absent', () => {
    expect(
      summarizePageBeatMetadata({
        one_line_hook: 'Quiet page.',
        panels: [],
      }),
    ).toEqual({
      characters: 'No characters listed',
      locations: 'No locations listed',
      artStyle: 'No art style listed',
    });
  });
});
