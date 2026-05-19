import { describe, expect, it } from 'vitest';
import {
  ADVANCED_STUDIO_ACTION_LABELS,
  GUIDED_LAYOUT_DISCLOSURE_COPY,
  GUIDED_LAYOUT_DISCLOSURE_LEVELS,
  GUIDED_STORY_INTAKE_ACTION_LABELS,
  GUIDED_STORY_PHASE_COPY,
  GUIDED_VISUAL_REFERENCE_ACTION_LABEL,
  GUIDED_VISUAL_REFERENCE_EMPTY_LABELS,
  GUIDED_VISUAL_REFERENCE_NAME_CLASS,
  GUIDED_VISUAL_REFERENCE_ROW_CLASS,
  GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS,
  GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY,
  GUIDED_WRITERS_WORKSHOP_TOOL_ACTION_LABELS,
  hasGuidedComicOutlineDraft,
} from '@/portals/guided-comic/GuidedComicFlow';
import { GUIDED_WORKFLOW_STEPS } from '@/modes/comic/pages/ComicEditor';

describe('guided comic Advanced Studio access', () => {
  it('uses distinct labels for blank studio access and guided page handoff', () => {
    expect(ADVANCED_STUDIO_ACTION_LABELS.openBlank).toBe('Open blank Advanced Studio');
    expect(ADVANCED_STUDIO_ACTION_LABELS.sendPage).toBe('Send this page to Advanced Studio');
    expect(ADVANCED_STUDIO_ACTION_LABELS.openBlank).not.toBe(ADVANCED_STUDIO_ACTION_LABELS.sendPage);
  });

  it('keeps every guided workflow return step available from Advanced Studio', () => {
    expect(GUIDED_WORKFLOW_STEPS.map((step) => step.label)).toEqual([
      'Setup',
      'Story',
      'Pages',
      'Visual Prep',
      'Art',
      'Layout',
      'Export',
    ]);
  });

  it('describes the three guided layout disclosure levels without hiding Advanced Studio', () => {
    expect(GUIDED_LAYOUT_DISCLOSURE_COPY.start).toBe('Start with a layout, then adjust it.');
    expect(GUIDED_LAYOUT_DISCLOSURE_COPY.advanced).toBe(
      'Use Advanced Studio for custom shapes, lettering, overlays, and final polish.',
    );
    expect(GUIDED_LAYOUT_DISCLOSURE_LEVELS.map((level) => level.id)).toEqual(['simple', 'edit', 'advanced']);
    expect(GUIDED_LAYOUT_DISCLOSURE_LEVELS[0].controls).toContain('Make selected panel bigger');
    expect(GUIDED_LAYOUT_DISCLOSURE_LEVELS[1].controls).toContain('Drag rectangular panels');
    expect(GUIDED_LAYOUT_DISCLOSURE_LEVELS[2].controls).toContain('Custom shapes');
    expect(ADVANCED_STUDIO_ACTION_LABELS.openBlank).toContain('Advanced Studio');
  });

  it('separates story intake actions from outline review pressure', () => {
    expect(GUIDED_STORY_INTAKE_ACTION_LABELS).toEqual([
      'Expand premise',
      'Generate possible conflicts',
      'Suggest character dynamics',
      'Generate story foundation',
    ]);
    expect(GUIDED_STORY_PHASE_COPY.assistantInactiveTitle).toBe('Outline development');
    expect(GUIDED_STORY_PHASE_COPY.assistantTitle).toBe('Story pacing assistant');
    expect(hasGuidedComicOutlineDraft([{ description: '' }, { description: '   ' }])).toBe(false);
    expect(hasGuidedComicOutlineDraft([{ description: 'Opening hook exists.' }])).toBe(true);
  });

  it('offers Writers Workshop as an explicit bridge without forcing it', () => {
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.continueLocal).toBe('Continue locally');
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.useWorkshop).toBe('Choose Writer issue');
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.importLatest).toBe('Import outline/page beats');
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.openLinked).toBe('Open linked issue in Writers Workshop');
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.linkSelected).toBe('Link issue only');
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.generateMissingPageBeats).toBe('Generate missing page beats');
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY.summary).toContain('Linking connects');
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY.summary).toContain('Importing is the separate step');
    expect(GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY.linkedNextStepBody).toContain('Nothing is imported automatically');
    expect(GUIDED_WRITERS_WORKSHOP_TOOL_ACTION_LABELS).toEqual([
      'Generate Writer outline',
      'Run pacing review',
      'Generate page beats',
      'Draft selected page dialogue',
    ]);
  });

  it('keeps Visual Prep reference rows readable for long missing-reference names', () => {
    expect(GUIDED_VISUAL_REFERENCE_ROW_CLASS).toContain('minmax(190px,260px)');
    expect(GUIDED_VISUAL_REFERENCE_ROW_CLASS).toContain('minmax(104px,124px)');
    expect(GUIDED_VISUAL_REFERENCE_NAME_CLASS).toContain('line-clamp-2');
    expect(GUIDED_VISUAL_REFERENCE_NAME_CLASS).toContain('break-words');
    expect(GUIDED_VISUAL_REFERENCE_ACTION_LABEL).toBe('Add ref');
    expect(GUIDED_VISUAL_REFERENCE_EMPTY_LABELS.location).toBe('No refs selected.');
  });
});
