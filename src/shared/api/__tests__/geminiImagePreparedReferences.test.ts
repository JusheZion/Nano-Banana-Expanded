import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateImage } from '@/shared/api/geminiImageApi';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('generateImage prepared Imageshop references', () => {
  it('encodes each prepared image immediately after its explicit provider instruction', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.contents[0].parts.slice(0, 4)).toEqual([
        {
          text: '[Character DNA: preserve identity.]\n',
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: 'character-base64',
          },
        },
        {
          text: '[Environment: preserve location.]\n',
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: 'environment-base64',
          },
        },
      ]);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: 'generated-base64',
                    },
                  },
                ],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateImage({
      prompt: 'Flux enters the observatory.',
      referenceImageUrls: [],
      preparedReferenceImages: [
        {
          id: 'flux',
          providerInstruction: '[Character DNA: preserve identity.]',
          base64: 'character-base64',
          mimeType: 'image/png',
        },
        {
          id: 'observatory',
          providerInstruction: '[Environment: preserve location.]',
          base64: 'environment-base64',
          mimeType: 'image/jpeg',
        },
      ],
      seed: 42,
      aspectRatio: '21:9',
      modelId: 'pro',
      context: 'character',
    });

    expect(result).toEqual({
      ok: true,
      imageDataUrl: 'data:image/png;base64,generated-base64',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
