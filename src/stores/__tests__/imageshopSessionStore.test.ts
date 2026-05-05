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
