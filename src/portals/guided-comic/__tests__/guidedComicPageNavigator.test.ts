import { describe, expect, it } from 'vitest';
import {
  getGuidedComicWorkspaceMode,
  getGuidedPageNavigatorButtonLabel,
  normalizeGuidedComicReopenPreference,
  normalizeGuidedComicWorkspaceMode,
  shouldStartGuidedPanelMoveDrag,
  shouldRenderGuidedPageNavigator,
} from '@/portals/guided-comic/GuidedComicFlow';

describe('guided comic page navigator', () => {
  it('only renders during Pages or Layout when pages exist', () => {
    expect(shouldRenderGuidedPageNavigator('pages', 1)).toBe(true);
    expect(shouldRenderGuidedPageNavigator('layout', 2)).toBe(true);
    expect(shouldRenderGuidedPageNavigator('art', 2)).toBe(false);
    expect(shouldRenderGuidedPageNavigator('pages', 0)).toBe(false);
  });

  it('uses compact numeric labels for page buttons', () => {
    expect(getGuidedPageNavigatorButtonLabel(12)).toBe('12');
  });
});

describe('guided comic focus choreography modes', () => {
  it('keeps prep mode when no pages exist', () => {
    expect(getGuidedComicWorkspaceMode('setup', 0, false, 'issue-lightbox')).toBe('story-prep');
    expect(getGuidedComicWorkspaceMode('art', 0, true, 'panel-focus')).toBe('story-prep');
  });

  it('maps story steps to prep and production steps to page production', () => {
    expect(getGuidedComicWorkspaceMode('story', 3, false)).toBe('story-prep');
    expect(getGuidedComicWorkspaceMode('visual-prep', 3, false)).toBe('story-prep');
    expect(getGuidedComicWorkspaceMode('art', 3, false)).toBe('page-production');
    expect(getGuidedComicWorkspaceMode('layout', 3, false)).toBe('page-production');
    expect(getGuidedComicWorkspaceMode('export', 3, false)).toBe('page-production');
  });

  it('honors explicit focus requests once pages exist', () => {
    expect(getGuidedComicWorkspaceMode('art', 3, false, 'issue-lightbox')).toBe('issue-lightbox');
    expect(getGuidedComicWorkspaceMode('art', 3, false, 'issue-cover')).toBe('issue-cover');
    expect(getGuidedComicWorkspaceMode('story', 3, false, 'page-production')).toBe('page-production');
    expect(getGuidedComicWorkspaceMode('art', 3, false, 'panel-focus')).toBe('panel-focus');
    expect(getGuidedComicWorkspaceMode('art', 3, true)).toBe('panel-focus');
  });

  it('normalizes persisted workspace and reopen preference values', () => {
    expect(normalizeGuidedComicWorkspaceMode('issue-cover')).toBe('issue-cover');
    expect(normalizeGuidedComicWorkspaceMode('panel-focus')).toBe('panel-focus');
    expect(normalizeGuidedComicWorkspaceMode('dashboard')).toBeNull();
    expect(normalizeGuidedComicReopenPreference('issue-lightbox')).toBe('issue-lightbox');
    expect(normalizeGuidedComicReopenPreference('page-production')).toBe('page-production');
    expect(normalizeGuidedComicReopenPreference('invalid')).toBe('last-active');
  });
});

describe('guided comic panel move drag targets', () => {
  it('allows dragging from regular panel content', () => {
    const panelBody = document.createElement('div');
    panelBody.textContent = 'Panel beat';

    expect(shouldStartGuidedPanelMoveDrag(panelBody)).toBe(true);
  });

  it('keeps buttons and form controls from starting panel move drags', () => {
    const button = document.createElement('button');
    const textarea = document.createElement('textarea');

    expect(shouldStartGuidedPanelMoveDrag(button)).toBe(false);
    expect(shouldStartGuidedPanelMoveDrag(textarea)).toBe(false);
  });
});
