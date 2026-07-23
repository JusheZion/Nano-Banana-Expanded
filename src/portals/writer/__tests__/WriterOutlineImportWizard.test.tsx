import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlineImportWizard } from '../WriterOutlineImportWizard';
import { DEFAULT_OUTLINE_PASTE_PREFERENCES } from '../writerOutlinePastePreferences';

describe('WriterOutlineImportWizard', () => {
  it('analyzes pasted text and hands the lossless diagnostic to detailed review', () => {
    const onApply = vi.fn();
    render(
      <WriterOutlineImportWizard
        issueId="issue-2"
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
        onPreferencesChange={vi.fn()}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Outline import source' }), {
      target: { value: 'Page 1 — Opening\nLoose ending' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));

    expect(screen.getByRole('dialog', { name: 'Review what the outline recognized' })).not.toBeNull();
    expect(screen.getByText('Loose ending')).not.toBeNull();
  });

  it('loads Markdown files through the same analyzer', async () => {
    render(
      <WriterOutlineImportWizard
        issueId="issue-3"
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
        onPreferencesChange={vi.fn()}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const file = new File(['# TITLE: Harbor\nPage 1 — Arrival'], 'outline.md', { type: 'text/markdown' });
    fireEvent.change(screen.getByLabelText('Choose TXT or Markdown outline'), { target: { files: [file] } });
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Outline import source' }) as HTMLTextAreaElement).value).toContain('Harbor'));
    expect(screen.getByRole('status').textContent).toMatch(/Markdown/i);
  });

  it('rejects unsupported files without replacing current text', async () => {
    render(
      <WriterOutlineImportWizard
        issueId="issue-1"
        initialText="Keep me"
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
        onPreferencesChange={vi.fn()}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const file = new File(['bad'], 'outline.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(screen.getByLabelText('Choose TXT or Markdown outline'), { target: { files: [file] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/TXT or Markdown/i);
    expect((screen.getByRole('textbox', { name: 'Outline import source' }) as HTMLTextAreaElement).value).toBe('Keep me');
  });

  it('confirms a dirty close and saves a resumable source draft', () => {
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <WriterOutlineImportWizard
        issueId="issue-close"
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
        onPreferencesChange={vi.fn()}
        onApply={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Outline import source' }), { target: { value: 'Unsaved draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close import' }));
    expect(onClose).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close import' }));
    expect(onClose).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });

  it('runs classification automatically only for classify-with-review preference', async () => {
    const onSuggest = vi.fn(async (diagnostic) => diagnostic);
    render(
      <WriterOutlineImportWizard
        issueId="issue-auto"
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES, aiClassification: 'classify_with_review' }}
        onPreferencesChange={vi.fn()}
        onApply={vi.fn()}
        onClose={vi.fn()}
        onSuggest={onSuggest}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Outline import source' }), { target: { value: 'Loose passage' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
    await waitFor(() => expect(onSuggest).toHaveBeenCalledOnce());
    expect(screen.getByRole('dialog', { name: 'Review what the outline recognized' })).not.toBeNull();
  });
});
