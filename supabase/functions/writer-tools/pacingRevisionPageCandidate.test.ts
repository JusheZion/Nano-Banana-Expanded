import { describe, expect, it, vi } from 'vitest';
import { generateValidatedPacingRevisionPageCandidate } from './pacingRevisionPageCandidate.ts';

describe('generateValidatedPacingRevisionPageCandidate', () => {
  it('retries malformed output once at lower temperature', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce({ panels: [{ composition: 'wide' }] })
      .mockResolvedValueOnce({ panels: [{ action: 'She opens the door.' }] });
    const result = await generateValidatedPacingRevisionPageCandidate(
      generate,
      (value) => {
        const action = (value as { panels?: Array<{ action?: string }> }).panels?.[0]?.action;
        if (!action) throw new Error('panel action required');
        return action;
      },
    );
    expect(result).toBe('She opens the door.');
    expect(generate.mock.calls.map(([temperature]) => temperature)).toEqual([0.45, 0.15]);
  });
});
