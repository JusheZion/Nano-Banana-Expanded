import { describe, expect, it } from 'vitest';
import { classifyGeminiImageFailure } from '@/shared/api/geminiImageApi';

describe('classifyGeminiImageFailure', () => {
  it.each([
    ['Missing VITE_GEMINI_API_KEY', 'missing-key'],
    ['Blocked by safety filters.', 'safety'],
    ['Rate limited. Try again in a moment.', 'quota-rate-limit'],
    ['Image request timed out. Try again.', 'timeout'],
    ['Failed to fetch reference image (403)', 'reference-fetch'],
    ['Reference payload exceeds the maximum request size', 'reference-size'],
    ['No image in response', 'no-image'],
    ['Unsupported URL type; use data:, blob:, or http(s)', 'unsupported-payload'],
    ['Network error while calling image API', 'network'],
    ['Something entirely unexpected happened', 'unknown'],
  ] as const)('classifies %s as %s', (message, expectedClass) => {
    expect(classifyGeminiImageFailure(message).errorClass).toBe(expectedClass);
  });

  it('marks only recoverable classes as retryable', () => {
    expect(classifyGeminiImageFailure('Rate limited. Try again in a moment.').retryable).toBe(true);
    expect(classifyGeminiImageFailure('Image request timed out. Try again.').retryable).toBe(true);
    expect(classifyGeminiImageFailure('Missing VITE_GEMINI_API_KEY').retryable).toBe(false);
    expect(classifyGeminiImageFailure('Blocked by safety filters.').retryable).toBe(false);
  });
});
