import { beforeEach, describe, expect, it } from 'vitest';
import { useImageshopSessionStore } from '@/stores/imageshopSessionStore';

beforeEach(() => {
  useImageshopSessionStore.setState({
    results: [],
    activeResultId: null,
  });
  sessionStorage.clear();
});

describe('useImageshopSessionStore', () => {
  it('stores generated results and makes the newest result active', () => {
    const first = useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,first',
      seed: 1,
      prompt: 'first prompt',
      aspectRatio: '9:16',
      context: 'character',
      modelId: 'pro',
    });
    const second = useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,second',
      seed: 2,
      prompt: 'second prompt',
      aspectRatio: '1:1',
      context: 'asset',
      modelId: 'pro',
    });

    expect(useImageshopSessionStore.getState().results.map((result) => result.imageUrl)).toEqual([
      'data:image/png;base64,second',
      'data:image/png;base64,first',
    ]);
    expect(useImageshopSessionStore.getState().activeResultId).toBe(second.id);
    expect(first.id).not.toBe(second.id);
  });

  it('keeps generated image data in runtime state but removes it from sessionStorage persistence', () => {
    useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,full-generated-payload',
      imageAsset: {
        id: 'imageshop-asset-1',
        mimeType: 'image/png',
        byteLength: 24,
      },
      seed: 1,
      prompt: 'persist metadata only',
      aspectRatio: '9:16',
      context: 'character',
      modelId: 'pro',
      attempt: {
        id: 'attempt-session-storage',
        queueItemId: 'panel-session-storage',
        pageNumber: 1,
        panelNumber: 1,
        status: 'generated',
        model: 'pro',
        promptHash: 'hash',
        referenceCount: 0,
        elapsedMs: 100,
        seed: 1,
        retryCount: 0,
        strategy: 'normal',
        imageUrl: 'data:image/png;base64,nested-session-payload',
      },
    });

    expect(useImageshopSessionStore.getState().results[0].imageUrl).toContain('full-generated-payload');
    const persisted = sessionStorage.getItem('arcs-imageshop-session-v1') ?? '';
    expect(persisted).toContain('imageshop-asset-1');
    expect(persisted).not.toContain('full-generated-payload');
    expect(persisted).not.toContain('nested-session-payload');
  });

  it('strips legacy generated payloads while rehydrating session metadata', async () => {
    sessionStorage.setItem(
      'arcs-imageshop-session-v1',
      JSON.stringify({
        state: {
          results: [
            {
              id: 'legacy-session-result',
              imageUrl: 'data:image/png;base64,legacy-session-payload',
              seed: 9,
              prompt: 'Legacy prompt',
              aspectRatio: '1:1',
              context: 'asset',
              modelId: 'pro',
              generatedAt: '2026-06-05T12:00:00.000Z',
            },
          ],
          activeResultId: 'legacy-session-result',
        },
        version: 1,
      }),
    );

    await useImageshopSessionStore.persist.rehydrate();

    expect(useImageshopSessionStore.getState().results[0]).toMatchObject({
      id: 'legacy-session-result',
      imageUrl: '',
      prompt: 'Legacy prompt',
    });
  });

  it('keeps only the latest eight generated results', () => {
    for (let index = 0; index < 10; index += 1) {
      useImageshopSessionStore.getState().addResult({
        imageUrl: `data:image/png;base64,${index}`,
        seed: index,
        prompt: `prompt ${index}`,
        aspectRatio: '9:16',
        context: 'character',
        modelId: 'pro',
      });
    }

    const results = useImageshopSessionStore.getState().results;
    expect(results).toHaveLength(8);
    expect(results[0].imageUrl).toBe('data:image/png;base64,9');
    expect(results[7].imageUrl).toBe('data:image/png;base64,2');
  });

  it('removes the active result and selects the next available result', () => {
    const first = useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,first',
      seed: 1,
      prompt: 'first prompt',
      aspectRatio: '9:16',
      context: 'character',
      modelId: 'pro',
    });
    const second = useImageshopSessionStore.getState().addResult({
      imageUrl: 'data:image/png;base64,second',
      seed: 2,
      prompt: 'second prompt',
      aspectRatio: '1:1',
      context: 'asset',
      modelId: 'pro',
    });

    useImageshopSessionStore.getState().removeResult(second.id);

    expect(useImageshopSessionStore.getState().activeResultId).toBe(first.id);
    expect(useImageshopSessionStore.getState().results).toHaveLength(1);
  });
});
