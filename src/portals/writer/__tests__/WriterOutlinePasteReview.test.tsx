import { useState, type ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlinePasteReview } from '../WriterOutlinePasteReview.tsx';
import { analyzeOutlinePaste, type OutlinePasteDiagnostic } from '../writerOutlinePasteReview';
import {
  DEFAULT_OUTLINE_PASTE_PREFERENCES,
  type OutlinePastePreferences,
} from '../writerOutlinePastePreferences';

function createDiagnostic(): OutlinePasteDiagnostic {
  const diagnostic = analyzeOutlinePaste([
    'TITLE: The Glass Harbor',
    'PREMISE: A cartographer maps a vanishing coast.',
    'Act I — The Tide Arrives',
    '1. Mara finds the first missing street.',
    'Remember the lighthouse motif.',
    'A second loose observation.',
  ].join('\n'));

  return {
    ...diagnostic,
    passages: diagnostic.passages.map((passage) => (
      passage.text.startsWith('1.') ? { ...passage, provenance: 'ai' as const } : passage
    )),
  };
}

function renderReview(overrides: Partial<ComponentProps<typeof WriterOutlinePasteReview>> = {}) {
  const props: ComponentProps<typeof WriterOutlinePasteReview> = {
    diagnostic: createDiagnostic(),
    preferences: { ...DEFAULT_OUTLINE_PASTE_PREFERENCES },
    onApply: vi.fn(),
    onKeepUnstructured: vi.fn(),
    onCancel: vi.fn(),
    onPreferencesChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<WriterOutlinePasteReview {...props} />), props };
}

function selectPassage(text: string): void {
  fireEvent.click(screen.getByRole('checkbox', { name: `Select passage: ${text}` }));
}

function chooseAssignment(label: string): void {
  fireEvent.change(screen.getByRole('combobox', { name: 'Assign selected to' }), {
    target: { value: label },
  });
}

describe('WriterOutlinePasteReview', () => {
  it('names the dialog and moves focus to its heading', async () => {
    renderReview();

    const dialog = screen.getByRole('dialog', { name: 'Review what the outline recognized' });
    const heading = within(dialog).getByRole('heading', { name: 'Review what the outline recognized' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('summarizes recognition, prominently lists unassigned text and warnings, and explains preservation', () => {
    renderReview();

    expect(screen.getByText(/Your original paste is preserved/i)).not.toBeNull();
    expect(screen.getByText(/Nothing has been discarded/i)).not.toBeNull();
    expect(screen.getByText(/official outline has not changed/i)).not.toBeNull();
    const summary = screen.getByRole('region', { name: 'Outline summary' });
    expect(within(summary).getByText('Title')).not.toBeNull();
    expect(within(summary).getByText('Premise')).not.toBeNull();
    expect(within(summary).getByText('Acts')).not.toBeNull();
    expect(within(summary).getByText('Page Beats')).not.toBeNull();
    expect(within(summary).getByText('Notes')).not.toBeNull();
    expect(screen.getByTestId('count-title').textContent).toContain('1');
    expect(screen.getByTestId('count-premise').textContent).toContain('1');
    expect(screen.getByTestId('count-act').textContent).toContain('1');
    expect(screen.getByTestId('count-page_beat').textContent).toContain('1');
    expect(screen.getByTestId('count-notes').textContent).toContain('0');
    expect(screen.getByTestId('unassigned-count').textContent).toContain('2');
    expect(screen.getAllByText('Remember the lighthouse motif.').length).toBeGreaterThan(0);
    expect(screen.getByText('2 passages require assignment.')).not.toBeNull();
  });

  it('selects one or all passages with native checkboxes', () => {
    renderReview();
    const passageCheckboxes = screen.getAllByRole('checkbox', { name: /^Select passage:/ });

    fireEvent.click(passageCheckboxes[0]);
    expect((passageCheckboxes[0] as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('1 passage selected');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all passages' }));
    passageCheckboxes.forEach((checkbox) => expect((checkbox as HTMLInputElement).checked).toBe(true));
  });

  it('assigns selected text to Notes locally and only emits the proposal on Apply', () => {
    const diagnostic = createDiagnostic();
    const onApply = vi.fn();
    const onKeep = vi.fn();
    const onCancel = vi.fn();
    const onPreferencesChange = vi.fn();

    render(
      <WriterOutlinePasteReview
        diagnostic={diagnostic}
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
        onApply={onApply}
        onKeepUnstructured={onKeep}
        onCancel={onCancel}
        onPreferencesChange={onPreferencesChange}
      />,
    );
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment('notes');
    expect(screen.getByText(/original paste is preserved/i)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('Assigned 1 passage to Notes');

    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.calls[0][0].passages.find((passage) => (
      passage.text === 'Remember the lighthouse motif.'
    ))).toMatchObject({ assignment: 'notes', provenance: 'user' });
  });

  it('requires an Act name or number before assigning an Act', () => {
    const { props } = renderReview();
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment('act');

    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    expect(screen.getByText('Enter an Act name or number before assigning.')).not.toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: 'Act name or number' }), {
      target: { value: 'Act II' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));

    expect(vi.mocked(props.onApply).mock.calls[0][0].passages.find((passage) => (
      passage.text === 'Remember the lighthouse motif.'
    ))).toMatchObject({ assignment: 'act', actName: 'Act II', provenance: 'user' });
  });

  it('assigns sequential page numbers to multiple selected Page Beats', () => {
    const { props } = renderReview();
    selectPassage('Remember the lighthouse motif.');
    selectPassage('A second loose observation.');
    chooseAssignment('page_beat');
    fireEvent.change(screen.getByRole('spinbutton', { name: /^First page number/ }), {
      target: { value: '7' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));

    const applied = vi.mocked(props.onApply).mock.calls[0][0] as OutlinePasteDiagnostic;
    expect(applied.passages.slice(-2)).toMatchObject([
      { assignment: 'page_beat', pageTarget: 7, provenance: 'user' },
      { assignment: 'page_beat', pageTarget: 8, provenance: 'user' },
    ]);
  });

  it('keeps invalid Page Beat metadata unresolved with visible feedback', () => {
    const diagnostic = createDiagnostic();
    const { props } = renderReview({ diagnostic });
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment('page_beat');

    fireEvent.change(screen.getByRole('spinbutton', { name: /^First page number/ }), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    expect(screen.getByText('Enter a whole first page number from 1 to 200.')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));
    expect(vi.mocked(props.onApply)).toHaveBeenCalledWith(diagnostic);
  });

  it('restores the original diagnostic after local review changes', () => {
    const diagnostic = createDiagnostic();
    const { props } = renderReview({ diagnostic });
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment('notes');
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));

    fireEvent.click(screen.getByRole('button', { name: 'Restore original recognition' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));

    expect(vi.mocked(props.onApply)).toHaveBeenCalledWith(diagnostic);
    expect(screen.getByRole('status').textContent).toContain('Original recognition restored');
  });

  it('keeps the exact paste as unstructured source or cancels without applying', () => {
    const diagnostic = createDiagnostic();
    const { props } = renderReview({ diagnostic });

    fireEvent.click(screen.getByRole('button', { name: 'Keep as unstructured source' }));
    expect(vi.mocked(props.onKeepUnstructured)).toHaveBeenCalledWith(diagnostic.originalText);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel — keep current outline' }));
    expect(vi.mocked(props.onCancel)).toHaveBeenCalledOnce();
    expect(vi.mocked(props.onApply)).not.toHaveBeenCalled();
  });

  it('cancels on Escape when idle and blocks Escape and actions while busy', () => {
    const onCancel = vi.fn();
    const onApply = vi.fn();
    const onKeepUnstructured = vi.fn();
    const onPreferencesChange = vi.fn();
    const { rerender } = renderReview({
      onCancel,
      onApply,
      onKeepUnstructured,
      onPreferencesChange,
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(
      <WriterOutlinePasteReview
        diagnostic={createDiagnostic()}
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
        busy
        onApply={onApply}
        onKeepUnstructured={onKeepUnstructured}
        onCancel={onCancel}
        onPreferencesChange={onPreferencesChange}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    expect((screen.getByRole('button', { name: 'Applying reviewed paste' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Keep as unstructured source' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancel — keep current outline' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox', { name: "Don't show these tips again" }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: "Don't show these tips again" }));
    expect(onPreferencesChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('Applying reviewed paste');
  });

  it('shows first-use guidance, dismisses it through preferences, and hides it when disabled', () => {
    const onPreferencesChange = vi.fn();
    const { rerender } = renderReview({ onPreferencesChange });

    expect(screen.getByRole('heading', { name: 'Why this review opened' })).not.toBeNull();
    expect(screen.getByText(/Unassigned Text needs your decision/i)).not.toBeNull();
    expect(screen.getByText(/Nothing changes until you choose Apply reviewed paste/i)).not.toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: "Don't show these tips again" }));
    expect(onPreferencesChange).toHaveBeenCalledWith(expect.objectContaining({
      showFirstUseGuidance: false,
    }));

    const hiddenPreferences: OutlinePastePreferences = {
      ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
      showFirstUseGuidance: false,
    };
    rerender(
      <WriterOutlinePasteReview
        diagnostic={createDiagnostic()}
        preferences={hiddenPreferences}
        onApply={vi.fn()}
        onKeepUnstructured={vi.fn()}
        onCancel={vi.fn()}
        onPreferencesChange={onPreferencesChange}
      />,
    );
    expect(screen.queryByRole('heading', { name: 'Why this review opened' })).toBeNull();
  });

  it('exposes errors as alerts, updates as polite status, and writes AI provenance in text', () => {
    renderReview({ error: 'The reviewed paste could not be applied.' });

    expect(screen.getByRole('alert').textContent).toContain('The reviewed paste could not be applied.');
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText(/Suggested by AI/)).not.toBeNull();
    expect(screen.getAllByText(/Recognized by rules/).length).toBeGreaterThan(0);
  });

  it('uses a responsive two-column work area without fixed viewport sizing', () => {
    renderReview();
    const layout = screen.getByTestId('paste-review-layout');
    const dialog = screen.getByRole('dialog');

    expect(layout.className).toContain('grid-cols-1');
    expect(layout.className).toMatch(/lg:grid-cols-/);
    expect(dialog.className).not.toMatch(/h-screen|h-\[|max-h-\[|overflow-x-auto/);
  });

  it('returns focus to a launch button when the parent unmounts the review', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Review pasted outline</button>
          {open ? (
            <WriterOutlinePasteReview
              diagnostic={createDiagnostic()}
              preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
              onApply={vi.fn()}
              onKeepUnstructured={vi.fn()}
              onCancel={() => setOpen(false)}
              onPreferencesChange={vi.fn()}
            />
          ) : null}
        </>
      );
    }

    render(<Harness />);
    const launcher = screen.getByRole('button', { name: 'Review pasted outline' });
    launcher.focus();
    fireEvent.click(launcher);
    await waitFor(() => expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Review what the outline recognized' }),
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel — keep current outline' }));
    await waitFor(() => expect(document.activeElement).toBe(launcher));
  });
});
