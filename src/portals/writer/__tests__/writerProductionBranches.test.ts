import { describe, expect, it } from 'vitest';
import type { PageBeatsJson } from '@/shared/writer/types';
import {
  WRITER_AUDIT_MODE_OPTIONS,
  WRITER_PRODUCTION_BRANCH_OPTIONS,
  buildPreferredWriterExport,
  buildGuidedComicsHandoffExport,
  formatIssuePackAsMarkdown,
  summarizePageBeatMetadata,
  summarizeWriterAuditModes,
  summarizeWriterProductionBranches,
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

  it('summarizes expanded audit results into readable cards', () => {
    expect(
      summarizeWriterAuditModes({
        pacingResult: {
          emotional_arc: { summary: 'Kron moves from panic to agency.' },
        },
        canonResult: {
          summary: 'Continuity holds.',
          character_utilization: { summary: 'Santoro is underused after page 8.' },
          worldbuilding_density: { summary: 'The institute pages are dense but readable.' },
        },
      }),
    ).toMatchObject([
      { id: 'continuity', ready: true, summary: 'Continuity holds.' },
      { id: 'emotional_arc', ready: true, summary: 'Kron moves from panic to agency.' },
      { id: 'character_utilization', ready: true, summary: 'Santoro is underused after page 8.' },
      { id: 'worldbuilding_density', ready: true, summary: 'The institute pages are dense but readable.' },
    ]);
  });

  it('summarizes production branch readiness', () => {
    expect(
      summarizeWriterProductionBranches({
        hasOutline: true,
        pagesWithBeats: 4,
        pagesWithDialogue: 2,
        pageCount: 4,
        hasShotPlan: false,
        outputFormat: 'guided_comic_handoff',
      }),
    ).toMatchObject([
      { id: 'visual_prep', ready: true },
      { id: 'dialogue', ready: true, summary: '2/4 pages have dialogue.' },
      { id: 'exports', ready: true },
      { id: 'guided_comics_handoff', ready: true },
    ]);
  });

  it('builds a Guided Comics handoff package from issue pack data', () => {
    const handoff = buildGuidedComicsHandoffExport({
      issue_id: 'issue-1',
      exported_at: '2026-05-31T12:00:00.000Z',
      series: { title: 'Arc School' },
      production_defaults: { output_format: 'guided_comic_handoff' },
      issue: { issue_number: 1, title: 'Opening', synopsis: 'A rift opens.' },
      pages: [
        {
          page_number: 1,
          beats_json: {
            one_line_hook: 'Kron sees the rift.',
            characters: ['Kron'],
            locations: ['Institute'],
            art_style: 'ink wash',
            panels: [{ action: 'Kron studies the rift.' }],
          },
          script_text: 'PANEL 1\nKRON: What is that?',
        },
      ],
    });

    expect(handoff).toMatchObject({
      source: 'writers-workshop',
      target: 'guided-comics',
      writer_issue_id: 'issue-1',
      pages: [
        {
          page_number: 1,
          characters: ['Kron'],
          locations: ['Institute'],
          art_style: 'ink wash',
        },
      ],
    });
  });

  it('formats issue packs as markdown exports', () => {
    const markdown = formatIssuePackAsMarkdown({
      issue_id: 'issue-1',
      exported_at: '2026-05-31T12:00:00.000Z',
      series: { title: 'Arc School' },
      issue: { title: 'Opening', synopsis: 'A rift opens.' },
      pages: [
        {
          page_number: 1,
          beats_json: {
            one_line_hook: 'Kron sees the rift.',
            characters: ['Kron'],
            locations: ['Institute'],
            art_style: 'ink wash',
            panels: [{ index: 1, action: 'Kron studies the rift.' }],
          },
          script_text: null,
        },
      ],
    });

    expect(markdown).toContain('# Writers Workshop Issue Pack');
    expect(markdown).toContain('## Arc School - Opening');
    expect(markdown).toContain('- Characters: Kron');
    expect(markdown).toContain('- Panel 1: Kron studies the rift.');
  });

  it('builds preferred export payloads from saved output-format defaults', () => {
    const baseIssuePack = {
      issue_id: 'issue-1',
      exported_at: '2026-06-01T12:00:00.000Z',
      series: { title: 'Arc School' },
      issue: { title: 'Opening', synopsis: 'A rift opens.' },
      outline: {
        outline_json: {
          title: 'Opening',
          premise: 'A rift opens.',
          page_beats: [{ page_target: 1, summary: 'Kron sees the rift.' }],
        },
      },
      pages: [
        {
          page_number: 1,
          beats_json: {
            one_line_hook: 'Kron sees the rift.',
            characters: ['Kron'],
            locations: ['Institute'],
            art_style: 'ink wash',
            panels: [{ index: 1, action: 'Kron studies the rift.' }],
          },
          script_text: 'PANEL 1\nKRON: What is that?',
        },
      ],
    };

    expect(
      buildPreferredWriterExport({
        ...baseIssuePack,
        production_defaults: { output_format: 'guided_comic_handoff' },
      }),
    ).toMatchObject({
      label: 'Download Guided Comics handoff',
      filename: 'writer-guided-comics-handoff.json',
      kind: 'json',
    });

    expect(
      buildPreferredWriterExport({
        ...baseIssuePack,
        production_defaults: { output_format: 'fountain_screenplay' },
      }),
    ).toMatchObject({
      label: 'Download Fountain screenplay',
      filename: 'writer-dialogue.fountain',
      kind: 'text',
      mime: 'text/plain;charset=utf-8',
    });

    const loreExport = buildPreferredWriterExport({
        ...baseIssuePack,
        production_defaults: { output_format: 'lore_wiki' },
      });
    expect(loreExport.kind).toBe('text');
    expect(loreExport.kind === 'text' ? loreExport.body : '').toContain('## Characters');
  });
});
