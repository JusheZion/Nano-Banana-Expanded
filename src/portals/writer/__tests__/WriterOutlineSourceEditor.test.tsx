import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlineSourceEditor } from '../WriterOutlineSourceEditor';
import {
  DEFAULT_OUTLINE_PASTE_PREFERENCES,
  type OutlinePastePreferences,
} from '../writerOutlinePastePreferences';
import type { OutlinePasteDiagnostic } from '../writerOutlinePasteDiagnostic';

function SourceHarness({
  initial = 'Existing source',
  preferences = { ...DEFAULT_OUTLINE_PASTE_PREFERENCES },
  onReview = vi.fn(),
}: {
  initial?: string;
  preferences?: OutlinePastePreferences;
  onReview?: (diagnostic: OutlinePasteDiagnostic) => void;
}) {
  const [value, setValue] = useState(initial);
  const [settings, setSettings] = useState(preferences);
  return (
    <WriterOutlineSourceEditor
      id="test-source"
      value={value}
      onChange={setValue}
      preferences={settings}
      onPreferencesChange={setSettings}
      onReview={onReview}
    />
  );
}

function paste(textarea: HTMLElement, text: string): boolean {
  return fireEvent.paste(textarea, {
    clipboardData: { getData: (type: string) => (type === 'text/plain' ? text : '') },
  });
}

describe('WriterOutlineSourceEditor', () => {
  it('prevents default and opens review without changing source for uncertain paste', () => {
    const onReview = vi.fn();
    render(<SourceHarness initial="Before  after" onReview={onReview} />);
    const textarea = screen.getByRole('textbox', { name: 'Source outline' }) as HTMLTextAreaElement;
    textarea.setSelectionRange(7, 7);

    expect(paste(textarea, 'Loose prose.')).toBe(false);
    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({
      originalText: 'Before Loose prose. after',
      sourceType: 'clipboard',
    }));
    expect(textarea.value).toBe('Before  after');
    expect(screen.getByRole('status').textContent).toMatch(/review opened/i);
  });

  it('preserves uncertain never-interrupt paste exactly as unstructured source', () => {
    render(<SourceHarness initial="Before  after" preferences={{
      ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
      reviewFrequency: 'never_interrupt',
    }} />);
    const textarea = screen.getByRole('textbox', { name: 'Source outline' }) as HTMLTextAreaElement;
    const pasted = '  Loose prose.\nSecond line exactly.  ';
    textarea.setSelectionRange(7, 7);

    expect(paste(textarea, pasted)).toBe(false);
    expect(textarea.value).toBe(`Before ${pasted} after`);
    expect(screen.getByRole('status').textContent).toMatch(/kept unstructured/i);
  });

  it('keeps an uncertain paste byte-for-byte when the source was empty', () => {
    render(<SourceHarness initial="" preferences={{
      ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
      reviewFrequency: 'never_interrupt',
    }} />);
    const textarea = screen.getByRole('textbox', { name: 'Source outline' }) as HTMLTextAreaElement;
    const pasted = '  Loose prose.\nSecond line exactly.  ';

    paste(textarea, pasted);
    expect(textarea.value).toBe(pasted);
  });

  it('inserts confident paste at the caret and reports recognition counts and page target', () => {
    render(<SourceHarness initial={'TITLE: Before\n'} />);
    const textarea = screen.getByRole('textbox', { name: 'Source outline' }) as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    paste(textarea, 'Page 7 — Crossing.');
    expect(textarea.value).toBe('TITLE: Before\nPage 7 — Crossing.');
    expect(screen.getByRole('status').textContent).toMatch(/1 page beat/i);
    expect(screen.getByRole('status').textContent).toMatch(/page target 7/i);
  });

  it('keeps normal typing lossless and unchanged', () => {
    render(<SourceHarness initial="" />);
    const textarea = screen.getByRole('textbox', { name: 'Source outline' });
    fireEvent.change(textarea, { target: { value: '  Typed\nverbatim.  ' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('  Typed\nverbatim.  ');
  });

  it('offers a format guide and TXT/Markdown templates without DOCX', () => {
    render(<SourceHarness />);
    expect(screen.getByText('Format guide')).not.toBeNull();
    const txt = screen.getByRole('link', { name: 'TXT template' });
    const md = screen.getByRole('link', { name: 'Markdown template' });
    expect(txt.getAttribute('href')).toBe('/templates/writer-outline-template.txt');
    expect(txt.getAttribute('download')).toBe('writer-outline-template.txt');
    expect(md.getAttribute('href')).toBe('/templates/writer-outline-template.md');
    expect(md.getAttribute('download')).toBe('writer-outline-template.md');
    expect(screen.queryByText(/docx/i)).toBeNull();
  });
});
