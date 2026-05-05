import { describe, expect, it } from 'vitest';
import { ADVANCED_STUDIO_ACTION_LABELS } from '@/portals/guided-comic/GuidedComicFlow';
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
});
