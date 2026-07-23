import { describe, expect, it } from 'vitest';
import { analyzeOutlinePaste } from '../writerOutlinePasteDiagnostic';
import {
  clearOutlineImportDraft,
  loadOutlineImportDraft,
  saveOutlineImportDraft,
} from '../writerOutlineImportDraft';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('writerOutlineImportDraft', () => {
  it('round-trips a lossless issue-scoped diagnostic draft', () => {
    const storage = memoryStorage();
    const diagnostic = analyzeOutlinePaste('Page 1 — Opening\nLoose reflection', 'md');

    saveOutlineImportDraft(storage, 'issue-7', diagnostic, 2);

    expect(loadOutlineImportDraft(storage, 'issue-7')).toMatchObject({
      issueId: 'issue-7',
      step: 2,
      diagnostic: {
        originalText: 'Page 1 — Opening\nLoose reflection',
        sourceType: 'md',
      },
    });
    expect(loadOutlineImportDraft(storage, 'other-issue')).toBeNull();
  });

  it('rejects malformed drafts and clears only the requested issue', () => {
    const storage = memoryStorage();
    storage.setItem('writer:outline-import-draft:bad', '{oops');
    expect(loadOutlineImportDraft(storage, 'bad')).toBeNull();

    saveOutlineImportDraft(storage, 'one', analyzeOutlinePaste('One'), 1);
    saveOutlineImportDraft(storage, 'two', analyzeOutlinePaste('Two'), 1);
    clearOutlineImportDraft(storage, 'one');
    expect(loadOutlineImportDraft(storage, 'one')).toBeNull();
    expect(loadOutlineImportDraft(storage, 'two')?.diagnostic.originalText).toBe('Two');
  });
});
