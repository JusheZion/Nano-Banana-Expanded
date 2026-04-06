/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tocFromMarkdown } from '@/content/wiki/wikiToc';
import {
  writerHelpCategoryWikiHeadingId,
  type WriterHelpCategoryId,
} from '@/portals/writer/writerHelpRegistry';

const WRITER_HELP_ORDER: WriterHelpCategoryId[] = [
  'setup',
  'workflow',
  'pages_tools',
  'review_export',
  'keyboard',
];

const EXPECTED_HELP_LABELS = [
  'Setup',
  'Workflow',
  'Pages tools',
  'Review export',
  'Keyboard',
] as const;

describe("Writers' Workshop wiki anchors", () => {
  it('first five ## headings match Help categories and registry slugs', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const md = readFileSync(join(dir, 'writer.md'), 'utf8');
    const toc = tocFromMarkdown(md);

    expect(toc.length).toBeGreaterThanOrEqual(5);

    for (let i = 0; i < 5; i++) {
      expect(toc[i].label).toBe(EXPECTED_HELP_LABELS[i]);
      expect(toc[i].id).toBe(writerHelpCategoryWikiHeadingId(WRITER_HELP_ORDER[i]));
    }
  });

  it('every writerHelpCategoryWikiHeadingId appears as a ## slug in writer.md', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const md = readFileSync(join(dir, 'writer.md'), 'utf8');
    const ids = new Set(tocFromMarkdown(md).map((t) => t.id));
    for (const cat of WRITER_HELP_ORDER) {
      expect(ids.has(writerHelpCategoryWikiHeadingId(cat))).toBe(true);
    }
  });
});
