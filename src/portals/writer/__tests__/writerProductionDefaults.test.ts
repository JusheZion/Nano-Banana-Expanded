import { describe, expect, it } from 'vitest';
import {
  EMPTY_WRITER_PRODUCTION_DEFAULTS,
  buildProductionDefaultsPromptBlock,
  mergeProductionDefaultsIntoNotes,
  readProductionDefaultsFromNotes,
  resolveProductionDefaults,
} from '../writerProductionDefaults';

describe('writerProductionDefaults', () => {
  it('round-trips production defaults through existing notes metadata', () => {
    const notes = mergeProductionDefaultsIntoNotes(
      { writer_tool_cache: { x: 1 } },
      {
        ...EMPTY_WRITER_PRODUCTION_DEFAULTS,
        mediumType: 'comic',
        narrativeScope: 'multi_issue_arc',
        comicPanelDensity: 'dense',
        artStyle: 'high-contrast black ink with limited neon accents',
        characterConsistency: 'strict',
        outputFormat: 'comic_script_markdown',
        strictCanon: true,
        noVideoAssumptions: true,
        updatedAt: '2026-05-31T00:00:00.000Z',
      },
    );

    expect(notes.writer_tool_cache).toEqual({ x: 1 });
    expect(readProductionDefaultsFromNotes(notes).artStyle).toBe(
      'high-contrast black ink with limited neon accents',
    );
    expect(readProductionDefaultsFromNotes(notes).comicPanelDensity).toBe('dense');
    expect(readProductionDefaultsFromNotes(notes).outputFormat).toBe('comic_script_markdown');
    expect(readProductionDefaultsFromNotes(notes).updatedAt).toBe('2026-05-31T00:00:00.000Z');
  });

  it('resolves issue defaults over series defaults without schema changes', () => {
    const seriesNotes = mergeProductionDefaultsIntoNotes({}, {
      ...EMPTY_WRITER_PRODUCTION_DEFAULTS,
      mediumType: 'comic',
      narrativeScope: 'shared_universe',
      comicPanelDensity: 'standard',
      artStyle: 'clean silver age comic ink',
      characterConsistency: 'strict',
      strictCanon: true,
      noVideoAssumptions: true,
    });
    const issueNotes = {
      production_defaults: {
        comic_panel_density: 'sparse',
        art_style: 'painted watercolor comic pages',
        output_format: 'guided_comic_handoff',
      },
    };

    const resolved = resolveProductionDefaults(seriesNotes, issueNotes);

    expect(resolved.mediumType).toBe('comic');
    expect(resolved.narrativeScope).toBe('shared_universe');
    expect(resolved.comicPanelDensity).toBe('sparse');
    expect(resolved.artStyle).toBe('painted watercolor comic pages');
    expect(resolved.outputFormat).toBe('guided_comic_handoff');
    expect(resolved.strictCanon).toBe(true);
  });

  it('formats prompt context with no-video-assumptions and canon constraints', () => {
    const block = buildProductionDefaultsPromptBlock({
      ...EMPTY_WRITER_PRODUCTION_DEFAULTS,
      mediumType: 'comic',
      narrativeScope: 'single_issue',
      comicPanelDensity: 'standard',
      artStyle: 'clean line art',
      characterConsistency: 'strict',
      outputFormat: 'issue_pack_json',
      strictCanon: true,
      noVideoAssumptions: true,
    });

    expect(block).toContain('Primary medium: comic');
    expect(block).toContain('Panel density: standard');
    expect(block).toContain('Preferred output format: issue_pack_json');
    expect(block).toContain('Strict canon: yes');
    expect(block).toContain('No video assumptions: yes');
    expect(block).toContain('Do not translate the story into video');
  });
});
