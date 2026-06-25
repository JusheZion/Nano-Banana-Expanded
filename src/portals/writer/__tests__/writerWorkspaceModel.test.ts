import { describe, expect, it } from 'vitest';
import {
  WRITER_WORKSPACE_TAB_LABELS,
  WRITER_WORKSPACE_TAB_ORDER,
} from '@/portals/writer/writerSearch';

describe('writerWorkspaceModel', () => {
  it('starts with a focused dashboard and exposes Visual Canon as a first-class workspace', () => {
    expect(WRITER_WORKSPACE_TAB_ORDER.slice(0, 9)).toEqual([
      'dashboard',
      'outline',
      'scripts',
      'visual_canon',
      'lore',
      'beats',
      'dialogue',
      'arc',
      'video',
    ]);
    expect(WRITER_WORKSPACE_TAB_LABELS.dashboard).toMatchObject({
      ribbon: 'Dashboard',
      heading: 'Writer dashboard',
      description: 'Check the active issue, next step, locks, and readiness before generating.',
    });
    expect(WRITER_WORKSPACE_TAB_LABELS.visual_canon).toMatchObject({
      ribbon: 'Visual Canon',
      heading: 'Visual Canon',
      description: 'Attach images the AI should keep consistent when it writes page beats.',
    });
    expect(WRITER_WORKSPACE_TAB_LABELS.lore).toMatchObject({
      ribbon: 'Story Canon',
      heading: 'Story Canon (Lore)',
    });
  });

  it('keeps compare and export workspaces after the core writing path', () => {
    expect(WRITER_WORKSPACE_TAB_ORDER.slice(-2)).toEqual(['cockpit', 'export']);
  });
});
