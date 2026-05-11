import { describe, expect, it } from 'vitest';
import {
  ADVANCED_STUDIO_ACTION_LABELS,
  GUIDED_LAYOUT_DISCLOSURE_COPY,
  GUIDED_LAYOUT_DISCLOSURE_LEVELS,
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
});
