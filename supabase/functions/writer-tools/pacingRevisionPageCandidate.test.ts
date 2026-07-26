import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  it('does not retry transport failures as malformed model output', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('Gemini request timed out'));

    await expect(generateValidatedPacingRevisionPageCandidate(
      generate,
      (value) => value,
    )).rejects.toThrow('Gemini request timed out');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('uses the verified stable Flash Lite model for the bounded page preview request', () => {
    const indexSource = readFileSync(
      join(process.cwd(), 'supabase/functions/writer-tools/index.ts'),
      'utf8',
    );
    const branchStart = indexSource.indexOf("parsedReq.data.mode === 'pacing_revision_page_preview'");
    const branchEnd = indexSource.indexOf("parsedReq.data.mode === 'outline_treatment_preview'", branchStart);
    const previewBranch = indexSource.slice(branchStart, branchEnd);

    expect(branchStart).toBeGreaterThan(-1);
    expect(branchEnd).toBeGreaterThan(branchStart);
    expect(indexSource).toContain(
      "const PACING_REVISION_PAGE_GEMINI_MODEL = 'gemini-3.1-flash-lite';",
    );
    expect(previewBranch).toContain('preferredModel: PACING_REVISION_PAGE_GEMINI_MODEL');
  });
});
