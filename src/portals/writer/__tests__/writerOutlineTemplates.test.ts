import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WRITER_UI_TIPS } from '../writerHelpRegistry';
import {
  WRITER_OUTLINE_MARKDOWN_TEMPLATE,
  WRITER_OUTLINE_TEMPLATE_FILES,
  WRITER_OUTLINE_TEXT_TEMPLATE,
} from '../writerOutlineTemplates';

describe('writer outline templates', () => {
  it.each([
    ['TXT', WRITER_OUTLINE_TEXT_TEMPLATE],
    ['Markdown', WRITER_OUTLINE_MARKDOWN_TEMPLATE],
  ])('%s explains the flexible paste format with representative examples', (_label, template) => {
    expect(template).toContain('Title and Premise are optional');
    expect(template).toContain('Acts are optional');
    expect(template).toContain('ordinary prose is accepted and reviewable');
    expect(template).toContain('Act III —');
    expect(template).toContain('ASCII hyphen (-), en dash (–), or em dash (—)');
    expect(template).toMatch(/Page 1\s+[—-]/);
    expect(template).toMatch(/Pages 4-5\s+[—-]/);
    expect(template).toContain('Notes');
    expect(template).toContain('intentionally unassigned prose');
  });

  it('exports download metadata without a DOCX option', () => {
    expect(WRITER_OUTLINE_TEMPLATE_FILES).toEqual([
      {
        format: 'text',
        filename: 'writer-outline-template.txt',
        mimeType: 'text/plain;charset=utf-8',
        content: WRITER_OUTLINE_TEXT_TEMPLATE,
      },
      {
        format: 'markdown',
        filename: 'writer-outline-template.md',
        mimeType: 'text/markdown;charset=utf-8',
        content: WRITER_OUTLINE_MARKDOWN_TEMPLATE,
      },
    ]);
    expect(WRITER_OUTLINE_TEMPLATE_FILES.some(({ filename }) => filename.endsWith('.docx'))).toBe(false);
  });

  it.each(WRITER_OUTLINE_TEMPLATE_FILES)(
    'keeps public/$filename exactly equal to its exported content',
    ({ filename, content }) => {
      expect(readFileSync(join(process.cwd(), 'public', 'templates', filename), 'utf8')).toBe(content);
    },
  );

  it('registers concise help for every planned outline paste affordance', () => {
    expect(WRITER_UI_TIPS.outlinePasteReviewFrequency).toContain('review');
    expect(WRITER_UI_TIPS.outlinePasteAiClassification).toContain('AI');
    expect(WRITER_UI_TIPS.outlinePasteUnassignedText).toContain('Unassigned Text');
    expect(WRITER_UI_TIPS.outlinePasteRestoreOriginal).toContain('original');
    expect(WRITER_UI_TIPS.outlinePasteKeepUnstructured).toContain('unstructured');
    expect(WRITER_UI_TIPS.outlinePasteTemplateDownloads).toContain('TXT');
    expect(WRITER_UI_TIPS.outlinePasteSettings).toContain('Paste settings');
    expect(WRITER_UI_TIPS.outlinePasteFirstUseGuidance).toContain('first');
  });
});
