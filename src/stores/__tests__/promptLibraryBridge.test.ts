import { beforeEach, describe, expect, it } from 'vitest';
import { handoffToPromptDraft, usePromptLibraryBridge } from '../promptLibraryBridge';

describe('prompt library bridge', () => {
  beforeEach(() => {
    usePromptLibraryBridge.setState({
      portalToOpen: null,
      inboundDraft: null,
      useRequest: null,
    });
  });

  it('requests Prompt Library navigation for explicit source handoffs', () => {
    usePromptLibraryBridge.getState().requestSavePrompt({
      sourcePortal: 'lab',
      sourceLabel: 'Imageshop preflight',
      title: 'Panel prompt',
      promptText: 'Gold light across an archive chamber.',
      category: 'scene',
      sourceContext: { panelId: 'panel-1' },
      promptSections: { lighting: 'gold light' },
    });

    expect(usePromptLibraryBridge.getState().portalToOpen).toBe('prompts');
    const inbound = usePromptLibraryBridge.getState().consumeInboundDraft();
    expect(inbound?.sourcePortal).toBe('lab');
    expect(inbound?.sourceContext).toEqual({ panelId: 'panel-1' });
  });

  it('converts handoffs into editable prompt drafts with provenance', () => {
    const draft = handoffToPromptDraft({
      sourcePortal: 'writer',
      sourceLabel: 'Writer scene beat',
      title: 'Act one reveal',
      promptText: 'A ritual door opens.',
      category: 'scene',
      tags: ['writer', 'beat'],
      sourceContext: { chapter: 1 },
    });

    expect(draft.title).toBe('Act one reveal');
    expect(draft.tags).toBe('writer, beat');
    expect(draft.collections).toBe('ARCS handoffs');
    expect(draft.sourcePortal).toBe('writer');
    expect(draft.sourceLabel).toBe('Writer scene beat');
    expect(draft.sourceContext).toEqual({ chapter: 1 });
  });

  it('routes selected prompts to the requested target portal once', async () => {
    usePromptLibraryBridge.getState().requestUsePrompt({
      target: 'studio',
      title: 'Character portrait',
      promptText: 'Reference portrait prompt.',
      sourcePromptId: 'prompt-1',
      sourceLabel: 'Prompt Library',
    });

    expect(usePromptLibraryBridge.getState().portalToOpen).toBe('studio');
    expect(usePromptLibraryBridge.getState().consumeUseRequest('assets')).toBeNull();

    const request = usePromptLibraryBridge.getState().consumeUseRequest('studio');
    expect(request?.promptText).toBe('Reference portrait prompt.');

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    expect(usePromptLibraryBridge.getState().useRequest).toBeNull();
  });
});
