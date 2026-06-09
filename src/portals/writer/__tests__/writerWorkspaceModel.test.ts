import { describe, expect, it } from 'vitest';
import {
  WRITER_WORKSPACE_TAB_LABELS,
  WRITER_WORKSPACE_TAB_ORDER,
} from '@/portals/writer/writerSearch';

describe('writerWorkspaceModel', () => {
  it('starts with a focused dashboard and exposes Visual Canon as a first-class workspace', () => {
    expect(WRITER_WORKSPACE_TAB_ORDER.slice(0, 6)).toEqual([
      'dashboard',
      'outline',
      'visual_canon',
      'beats',
      'dialogue',
      'arc',
    ]);
    expect(WRITER_WORKSPACE_TAB_LABELS.dashboard).toMatchObject({
      ribbon: 'Dashboard',
      heading: 'Writer dashboard',
    });
    expect(WRITER_WORKSPACE_TAB_LABELS.visual_canon).toMatchObject({
      ribbon: 'Visual Canon',
      heading: 'Visual Canon',
    });
  });

  it('keeps All Tools workspaces after the focused writing path', () => {
    expect(WRITER_WORKSPACE_TAB_ORDER.slice(-3)).toEqual(['lore', 'video', 'cockpit']);
  });
});
