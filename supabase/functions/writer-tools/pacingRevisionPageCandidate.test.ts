import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  generateValidatedPacingRevisionPageCandidate,
  pacingRevisionPageResponseSchema,
} from './pacingRevisionPageCandidate.ts';

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

  it('exposes only the requested child layer in the structured output schema', () => {
    const beatsSchema = pacingRevisionPageResponseSchema(true, false);
    const dialogueSchema = pacingRevisionPageResponseSchema(false, true);
    const beatsItem = beatsSchema.properties.pages.items;
    const dialogueItem = dialogueSchema.properties.pages.items;

    expect(beatsItem.properties).toHaveProperty('proposed_beats_json');
    expect(beatsItem.properties).not.toHaveProperty('proposed_script_text');
    expect(beatsItem.required).toContain('proposed_beats_json');
    expect(dialogueItem.properties).toHaveProperty('proposed_script_text');
    expect(dialogueItem.properties).not.toHaveProperty('proposed_beats_json');
    expect(dialogueItem.required).toContain('proposed_script_text');
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
    expect(previewBranch).toContain("layer: 'beats'");
    expect(previewBranch).toContain("layer: 'dialogue'");
    expect(previewBranch).toContain('pageHasReadyBeats');
    expect(previewBranch).toContain('pageHasReadyDialogue');
    expect(previewBranch).toContain('Page Beats candidate is required before Dialogue');
    expect(previewBranch).toContain('includeBeats === includeDialogue');
    expect(previewBranch).toContain('executePacingRevisionPagePreviewFlow');
    expect(previewBranch).toContain('page_number');
    expect(previewBranch).toContain('target.pageId');
    expect(previewBranch).toContain('target.pageNumber');
    expect(previewBranch).not.toMatch(
      /\.from\('writer_pages'\)\s*\.(?:insert|upsert|update)\(/,
    );
    expect(previewBranch).not.toContain('include_beats !== false');
    expect(previewBranch).not.toContain('include_dialogue !== false');
  });
});
