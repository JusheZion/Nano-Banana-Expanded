import { useState, type ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlinePasteReview } from '../WriterOutlinePasteReview';
import { analyzeOutlinePaste, type OutlinePasteDiagnostic } from '../writerOutlinePasteDiagnostic';
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
  fireEvent.click(screen.getByRole('checkbox', { name: text }));
}

function passageCheckbox(text: string): HTMLInputElement {
  return screen.getByRole('checkbox', { name: text }) as HTMLInputElement;
}

function chooseAssignment(label: string): void {
  fireEvent.change(screen.getByRole('combobox', { name: 'Assign selected to' }), {
    target: { value: label },
  });
}

function forceClick(element: HTMLElement): void {
  element.removeAttribute('disabled');
  fireEvent.click(element);
}

function forceChange(element: HTMLElement, value: string): void {
  element.removeAttribute('disabled');
  fireEvent.change(element, { target: { value } });
}

describe('WriterOutlinePasteReview', () => {
  it('becomes recovery-only after an official version is saved', () => {
    const onApply = vi.fn();
    const onUndo = vi.fn();
    const onCancel = vi.fn();
    renderReview({
      onApply,
      onCancel,
      recovery: {
        savedVersion: 4,
        undoAvailable: true,
        onUndo,
      },
    });

    expect(screen.getByRole('dialog', { name: 'Finish saving reviewed outline' })).not.toBeNull();
    expect(screen.getAllByText(/official outline v4 is already saved/i)).toHaveLength(2);
    expect((screen.getByRole('checkbox', { name: 'Select all passages' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('combobox', { name: 'Assign selected to' }) as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Assign selected passages' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Restore original recognition' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Keep as unstructured source' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Retry source sync' }));
    expect(onApply).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Undo saved outline version' }));
    expect(onUndo).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Close recovery — saved version remains' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('keeps recovery-only controls inert during forced synthetic events', () => {
    const onApply = vi.fn();
    const onKeepUnstructured = vi.fn();
    const onPreferencesChange = vi.fn();
    renderReview({
      onApply,
      onKeepUnstructured,
      onPreferencesChange,
      recovery: {
        savedVersion: 4,
        undoAvailable: false,
        onUndo: vi.fn(),
      },
    });

    forceClick(passageCheckbox('Remember the lighthouse motif.'));
    forceChange(screen.getByRole('combobox', { name: 'Assign selected to' }), 'act');
    forceClick(screen.getByRole('button', { name: 'Assign selected passages' }));
    forceClick(screen.getByRole('button', { name: 'Restore original recognition' }));
    forceClick(screen.getByRole('button', { name: 'Keep as unstructured source' }));

    expect(passageCheckbox('Remember the lighthouse motif.').checked).toBe(false);
    expect((screen.getByRole('combobox', { name: 'Assign selected to' }) as HTMLSelectElement).value).toBe('notes');
    expect(onKeepUnstructured).not.toHaveBeenCalled();
    expect(onPreferencesChange).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Undo saved outline version' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/no preceding version is available to Undo/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry source sync' }));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('blocks every recovery action, synthetic clicks, and Escape while Undo is busy', () => {
    const onApply = vi.fn();
    const onUndo = vi.fn();
    const onCancel = vi.fn();
    const onKeepUnstructured = vi.fn();
    renderReview({
      onApply,
      onCancel,
      onKeepUnstructured,
      recovery: {
        savedVersion: 4,
        undoAvailable: true,
        undoBusy: true,
        onUndo,
      },
    });

    const retry = screen.getByRole('button', { name: 'Retry source sync' }) as HTMLButtonElement;
    const close = screen.getByRole('button', { name: 'Close recovery — saved version remains' }) as HTMLButtonElement;
    const undo = screen.getByRole('button', { name: 'Undoing…' }) as HTMLButtonElement;
    const keep = screen.getByRole('button', { name: 'Keep as unstructured source' }) as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    expect(close.disabled).toBe(true);
    expect(undo.disabled).toBe(true);
    expect(keep.disabled).toBe(true);

    forceClick(retry);
    forceClick(close);
    forceClick(undo);
    forceClick(keep);
    forceClick(screen.getByRole('button', { name: 'Restore original recognition' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onApply).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onKeepUnstructured).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/undoing saved outline/i);
  });

  it('names the dialog and moves focus to its heading', async () => {
    renderReview();

    const dialog = screen.getByRole('dialog', { name: 'Review what the outline recognized' });
    const heading = within(dialog).getByRole('heading', { name: 'Review what the outline recognized' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('traps focus at both boundaries and recovers focus moved outside the modal', () => {
    renderReview({ diagnostic: analyzeOutlinePaste('1. Opening\n3. Closing') });
    const first = screen.getByRole('checkbox', { name: "Don't show these tips again" });
    const last = screen.getByRole('button', { name: 'Apply reviewed paste' });
    const outside = document.createElement('button');
    outside.textContent = 'Outside control';
    document.body.appendChild(outside);
    try {
      last.focus();
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(document.activeElement).toBe(first);

      first.focus();
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(last);

      outside.focus();
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(document.activeElement).toBe(first);
    } finally {
      outside.remove();
    }
  });

  it('treats the initially focused non-tabbable heading as both Tab boundaries', async () => {
    renderReview({ diagnostic: analyzeOutlinePaste('1. Opening\n3. Closing') });
    const heading = screen.getByRole('heading', { name: 'Review what the outline recognized' });
    const first = screen.getByRole('checkbox', { name: "Don't show these tips again" });
    const last = screen.getByRole('button', { name: 'Apply reviewed paste' });
    await waitFor(() => expect(document.activeElement).toBe(heading));

    // This repository does not install @testing-library/user-event; use its established
    // window keydown path to exercise the same browser-level trap listener.
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    heading.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('contains focus on the dialog itself when busy disables every interactive control', () => {
    renderReview({ busy: true });
    const dialog = screen.getByRole('dialog');
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    try {
      outside.focus();
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(document.activeElement).toBe(dialog);
    } finally {
      outside.remove();
    }
  });

  it('uses a blocking backdrop that prevents pointer events from reaching background handlers', () => {
    const onBackgroundClick = vi.fn();
    render(
      <div onClick={onBackgroundClick}>
        <button type="button">Background action</button>
        <WriterOutlinePasteReview
          diagnostic={createDiagnostic()}
          preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
          onApply={vi.fn()}
          onKeepUnstructured={vi.fn()}
          onCancel={vi.fn()}
          onPreferencesChange={vi.fn()}
        />
      </div>,
    );

    const backdrop = screen.getByTestId('outline-paste-review-backdrop');
    expect(backdrop.className).toContain('fixed');
    expect(backdrop.className).toContain('inset-0');
    fireEvent.pointerDown(backdrop);
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onBackgroundClick).not.toHaveBeenCalled();
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
    expect(screen.getByTestId('inferred-page-count').textContent).toBe('1');
  });

  it('renders an explicit no-page-count state', () => {
    renderReview({ diagnostic: analyzeOutlinePaste('Loose prose only.') });
    expect(screen.getByTestId('inferred-page-count').textContent).toBe('No page count detected');
  });

  it('blocks Apply until blocking Unassigned Text is resolved', () => {
    const diagnostic = analyzeOutlinePaste('Place this note.');
    const { props } = renderReview({ diagnostic });
    const apply = screen.getByRole('button', { name: 'Apply reviewed paste' }) as HTMLButtonElement;

    expect(apply.disabled).toBe(true);
    expect(screen.getByTestId('apply-readiness').textContent).toMatch(/1 blocking issue/i);
    expect(screen.getByTestId('apply-readiness').textContent).toMatch(/select the affected passage/i);

    selectPassage('Place this note.');
    chooseAssignment('notes');
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    expect(apply.disabled).toBe(false);
    fireEvent.click(apply);
    expect(vi.mocked(props.onApply)).toHaveBeenCalledOnce();
  });

  it('keeps Apply enabled for advisory page gaps and labels the advisory state', () => {
    renderReview({ diagnostic: analyzeOutlinePaste('1. Opening\n3. Closing') });
    const apply = screen.getByRole('button', { name: 'Apply reviewed paste' }) as HTMLButtonElement;

    expect(apply.disabled).toBe(false);
    expect(screen.getByTestId('apply-readiness').textContent).toMatch(/advisory/i);
  });

  it('links warning passage IDs to clearly labeled affected rows', () => {
    const diagnostic = analyzeOutlinePaste('TITLE: First\nTITLE: Second');
    renderReview({ diagnostic });

    const affectedLinks = screen.getAllByRole('link', { name: /Line [12]/ });
    expect(affectedLinks.map((link) => link.getAttribute('href'))).toEqual(
      diagnostic.passages.map((passage) => `#paste-review-${passage.id}`),
    );
    diagnostic.passages.forEach((passage) => {
      expect(document.getElementById(`paste-review-${passage.id}`)?.getAttribute('data-warning-affected')).toBe('true');
    });
    expect((screen.getByRole('button', { name: 'Apply reviewed paste' }) as HTMLButtonElement).disabled).toBe(true);
    affectedLinks.forEach((link) => {
      expect(link.textContent).toMatch(/^Line [12]$/);
      expect(link.getAttribute('aria-describedby')).toBeTruthy();
      expect(link.textContent).not.toMatch(/First|Second/);
    });
  });

  it('selects one or all passages with native checkboxes', () => {
    renderReview();
    const passageCheckboxes = createDiagnostic().passages.map((passage) => passageCheckbox(passage.text.trim()));

    fireEvent.click(passageCheckboxes[0]);
    expect((passageCheckboxes[0] as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('1 passage selected');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all passages' }));
    passageCheckboxes.forEach((checkbox) => expect((checkbox as HTMLInputElement).checked).toBe(true));
  });

  it('gives checked rows persistent treatment, adjacent count, and complete accessible metadata', () => {
    renderReview();
    const checkbox = passageCheckbox('Remember the lighthouse motif.');
    fireEvent.click(checkbox);

    const row = checkbox.closest('[data-selected]');
    expect(row?.getAttribute('data-selected')).toBe('true');
    expect(row?.className).toMatch(/bg-amber|ring-amber/);
    expect(screen.getByTestId('selected-passage-count').textContent).toContain('1 selected');
    const descriptionId = checkbox.getAttribute('aria-describedby');
    const description = descriptionId ? document.getElementById(descriptionId)?.textContent : '';
    expect(description).toContain('Current assignment: Unassigned Text');
    expect(description).toContain('Provenance: Recognized by rules');
    expect(description).toContain('Line 5');
    expect(checkbox.getAttribute('aria-labelledby')).toBeTruthy();
    expect(checkbox.getAttribute('aria-label')).toBeNull();
    expect(checkbox.getAttribute('aria-labelledby')).not.toBe(checkbox.getAttribute('aria-describedby'));
    expect(screen.getByRole('checkbox', { name: 'Remember the lighthouse motif.' })).toBe(checkbox);
  });

  it('disables Assign until selection and required destination metadata are valid', () => {
    renderReview();
    const assign = screen.getByRole('button', { name: 'Assign selected passages' }) as HTMLButtonElement;

    expect(assign.disabled).toBe(true);
    expect(screen.getByTestId('assignment-guidance').textContent).toMatch(/select passages/i);
    selectPassage('Remember the lighthouse motif.');
    expect(assign.disabled).toBe(false);

    chooseAssignment('act');
    expect(assign.disabled).toBe(true);
    expect(screen.getByTestId('assignment-guidance').textContent).toMatch(/enter an Act name/i);
    fireEvent.change(screen.getByRole('textbox', { name: 'Act name or number' }), { target: { value: 'Act II' } });
    expect(assign.disabled).toBe(false);

    chooseAssignment('page_beat');
    expect(assign.disabled).toBe(true);
    fireEvent.change(screen.getByRole('spinbutton', { name: /^First page number/ }), { target: { value: '7' } });
    expect(assign.disabled).toBe(false);
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

    selectPassage('A second loose observation.');
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));
    expect(onApply).toHaveBeenCalledOnce();
    const applied = onApply.mock.calls[0][0] as OutlinePasteDiagnostic;
    expect(applied.passages.find((passage) => (
      passage.text === 'Remember the lighthouse motif.'
    ))).toMatchObject({ assignment: 'notes', provenance: 'user' });
  });

  it.each([
    { value: 'title', label: 'Title' },
    { value: 'premise', label: 'Premise' },
  ] as const)('assigns selected text to $label through the shared assignment path', ({ value }) => {
    const { props } = renderReview();
    if (value === 'title') {
      selectPassage('TITLE: The Glass Harbor');
      chooseAssignment('notes');
      fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    } else if (value === 'premise') {
      selectPassage('PREMISE: A cartographer maps a vanishing coast.');
      chooseAssignment('notes');
      fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    }
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment(value);
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    selectPassage('A second loose observation.');
    chooseAssignment('notes');
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));

    const applied = vi.mocked(props.onApply).mock.calls[0][0] as OutlinePasteDiagnostic;
    expect(applied.passages.find((passage) => (
      passage.text === 'Remember the lighthouse motif.'
    ))).toMatchObject({ assignment: value, provenance: 'user' });
  });

  it('keeps a manual Unassigned Text destination visibly blocking', () => {
    const { props } = renderReview();
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment('unassigned');
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));

    const checkbox = passageCheckbox('Remember the lighthouse motif.');
    const description = document.getElementById(checkbox.getAttribute('aria-describedby') ?? '')?.textContent;
    expect(description).toContain('Current assignment: Unassigned Text');
    expect(description).toContain('Provenance: Manually assigned');
    expect((screen.getByRole('button', { name: 'Apply reviewed paste' }) as HTMLButtonElement).disabled).toBe(true);
    expect(vi.mocked(props.onApply)).not.toHaveBeenCalled();
  });

  it.each([
    { value: 'title', label: 'Title' },
    { value: 'premise', label: 'Premise' },
  ] as const)('rejects multi-selection for singleton $label assignment', ({ value, label }) => {
    const diagnostic = createDiagnostic();
    const { props } = renderReview({ diagnostic });
    selectPassage('Remember the lighthouse motif.');
    selectPassage('A second loose observation.');
    chooseAssignment(value);

    expect((screen.getByRole('button', { name: 'Assign selected passages' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('assignment-guidance').textContent).toBe(`Choose exactly one passage for ${label}.`);
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));
    expect(vi.mocked(props.onApply)).not.toHaveBeenCalled();
  });

  it.each([
    { value: 'title', label: 'Title' },
    { value: 'premise', label: 'Premise' },
  ] as const)('protects the existing singleton $label owner from silent replacement', ({ value, label }) => {
    const diagnostic = createDiagnostic();
    const { props } = renderReview({ diagnostic });
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment(value);

    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    expect(screen.getByText(`${label} already has a passage. Move it to another destination first.`)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));
    expect(vi.mocked(props.onApply)).not.toHaveBeenCalled();
  });

  it('offers exactly the six supported manual assignment destinations', () => {
    renderReview();
    expect(screen.getAllByRole('option').map((option) => ({
      label: option.textContent,
      value: (option as HTMLOptionElement).value,
    }))).toEqual([
      { label: 'Title', value: 'title' },
      { label: 'Premise', value: 'premise' },
      { label: 'Act', value: 'act' },
      { label: 'Page Beat', value: 'page_beat' },
      { label: 'Notes', value: 'notes' },
      { label: 'Unassigned Text', value: 'unassigned' },
    ]);
  });

  it('requires an Act name or number before assigning an Act', () => {
    const { props } = renderReview();
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment('act');

    expect((screen.getByRole('button', { name: 'Assign selected passages' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('assignment-guidance').textContent).toMatch(/Enter an Act name or number/i);

    fireEvent.change(screen.getByRole('textbox', { name: 'Act name or number' }), {
      target: { value: 'Act II' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    selectPassage('A second loose observation.');
    chooseAssignment('notes');
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
    expect((screen.getByRole('button', { name: 'Assign selected passages' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('assignment-guidance').textContent).toMatch(/whole first page number from 1 to 200/i);

    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));
    expect(vi.mocked(props.onApply)).not.toHaveBeenCalled();
  });

  it('restores the original diagnostic after local review changes', () => {
    const diagnostic = createDiagnostic();
    const { props } = renderReview({ diagnostic });
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment('notes');
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));

    fireEvent.click(screen.getByRole('button', { name: 'Restore original recognition' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));

    expect(vi.mocked(props.onApply)).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Apply reviewed paste' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('Original recognition restored');
  });

  it('treats changed diagnostic identity as a new session but preserves stable rerenders', () => {
    const diagnostic = createDiagnostic();
    const nextDiagnostic = analyzeOutlinePaste('A genuinely new pasted passage.');
    const { rerender, props } = renderReview({ diagnostic });
    selectPassage('Remember the lighthouse motif.');
    chooseAssignment('act');
    fireEvent.change(screen.getByRole('textbox', { name: 'Act name or number' }), {
      target: { value: 'Act II' },
    });

    rerender(<WriterOutlinePasteReview {...props} diagnostic={diagnostic} error="Stable rerender" />);
    expect((screen.getByRole('combobox', { name: 'Assign selected to' }) as HTMLSelectElement).value).toBe('act');
    expect((screen.getByRole('textbox', { name: 'Act name or number' }) as HTMLInputElement).value).toBe('Act II');
    expect(passageCheckbox('Remember the lighthouse motif.').checked).toBe(true);

    rerender(<WriterOutlinePasteReview {...props} diagnostic={nextDiagnostic} error={null} />);
    expect((screen.getByRole('combobox', { name: 'Assign selected to' }) as HTMLSelectElement).value).toBe('notes');
    expect(screen.queryByRole('textbox', { name: 'Act name or number' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('No passages selected');

    chooseAssignment('act');
    expect((screen.getByRole('textbox', { name: 'Act name or number' }) as HTMLInputElement).value).toBe('');
    chooseAssignment('page_beat');
    expect((screen.getByRole('spinbutton', { name: /^First page number/ }) as HTMLInputElement).value).toBe('');
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

  it('keeps selection, assignment, restore, preferences, and outward actions inert during busy synthetic events', () => {
    const diagnostic = createDiagnostic();
    const onCancel = vi.fn();
    const onApply = vi.fn();
    const onKeepUnstructured = vi.fn();
    const onPreferencesChange = vi.fn();
    const { rerender } = renderReview({
      diagnostic,
      onCancel,
      onApply,
      onKeepUnstructured,
      onPreferencesChange,
    });
    selectPassage('Remember the lighthouse motif.');
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    selectPassage('A second loose observation.');

    rerender(
      <WriterOutlinePasteReview
        diagnostic={diagnostic}
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
        busy
        onApply={onApply}
        onKeepUnstructured={onKeepUnstructured}
        onCancel={onCancel}
        onPreferencesChange={onPreferencesChange}
      />,
    );

    forceClick(passageCheckbox('A second loose observation.'));
    forceClick(screen.getByRole('checkbox', { name: 'Select all passages' }));
    forceChange(screen.getByRole('combobox', { name: 'Assign selected to' }), 'act');
    forceClick(screen.getByRole('button', { name: 'Assign selected passages' }));
    forceClick(screen.getByRole('button', { name: 'Restore original recognition' }));
    forceClick(screen.getByRole('checkbox', { name: "Don't show these tips again" }));
    forceClick(screen.getByRole('button', { name: 'Applying reviewed paste' }));
    forceClick(screen.getByRole('button', { name: 'Keep as unstructured source' }));
    forceClick(screen.getByRole('button', { name: 'Cancel — keep current outline' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onApply).not.toHaveBeenCalled();
    expect(onKeepUnstructured).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onPreferencesChange).not.toHaveBeenCalled();

    rerender(
      <WriterOutlinePasteReview
        diagnostic={diagnostic}
        preferences={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES }}
        onApply={onApply}
        onKeepUnstructured={onKeepUnstructured}
        onCancel={onCancel}
        onPreferencesChange={onPreferencesChange}
      />,
    );
    expect(passageCheckbox('A second loose observation.').checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Select all passages' }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('combobox', { name: 'Assign selected to' }) as HTMLSelectElement).value).toBe('notes');
    expect(screen.queryByText('Enter an Act name or number before assigning.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed paste' }));
    const applied = onApply.mock.calls[0][0] as OutlinePasteDiagnostic;
    expect(applied.passages.find((passage) => (
      passage.text === 'Remember the lighthouse motif.'
    ))).toMatchObject({ assignment: 'notes', provenance: 'user' });
  });

  it('keeps Act metadata unchanged during a forced busy change', () => {
    const diagnostic = createDiagnostic();
    const { rerender, props } = renderReview({ diagnostic });
    chooseAssignment('act');
    fireEvent.change(screen.getByRole('textbox', { name: 'Act name or number' }), {
      target: { value: 'Act II' },
    });

    rerender(<WriterOutlinePasteReview {...props} diagnostic={diagnostic} busy />);
    forceChange(screen.getByRole('textbox', { name: 'Act name or number' }), 'Act III');
    rerender(<WriterOutlinePasteReview {...props} diagnostic={diagnostic} />);

    expect((screen.getByRole('textbox', { name: 'Act name or number' }) as HTMLInputElement).value).toBe('Act II');
  });

  it('keeps Page Beat metadata unchanged during a forced busy change', () => {
    const diagnostic = createDiagnostic();
    const { rerender, props } = renderReview({ diagnostic });
    chooseAssignment('page_beat');
    fireEvent.change(screen.getByRole('spinbutton', { name: /^First page number/ }), {
      target: { value: '7' },
    });

    rerender(<WriterOutlinePasteReview {...props} diagnostic={diagnostic} busy />);
    forceChange(screen.getByRole('spinbutton', { name: /^First page number/ }), '99');
    rerender(<WriterOutlinePasteReview {...props} diagnostic={diagnostic} />);

    expect((screen.getByRole('spinbutton', { name: /^First page number/ }) as HTMLInputElement).value).toBe('7');
  });

  it('shows first-use guidance, dismisses it through preferences, and hides it when disabled', () => {
    const onPreferencesChange = vi.fn();
    const { rerender } = renderReview({ onPreferencesChange });

    expect(screen.getByRole('heading', { name: 'Why this review opened' })).not.toBeNull();
    expect(screen.getByText(/Review Unassigned Text/i)).not.toBeNull();
    expect(screen.getAllByText(/Nothing changes until you choose Apply reviewed paste/i).length).toBeGreaterThan(0);
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

  it('dismisses onboarding for the current session without changing persistent preferences', () => {
    const onPreferencesChange = vi.fn();
    renderReview({ onPreferencesChange });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss tips for this session' }));
    expect(screen.queryByRole('heading', { name: 'Why this review opened' })).toBeNull();
    expect(onPreferencesChange).not.toHaveBeenCalled();
  });

  it('keeps essential preservation and apply guidance visible without opening the supplementary tooltip', () => {
    renderReview({
      preferences: {
        ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
        showFirstUseGuidance: false,
      },
    });

    expect(screen.getByText(/original paste is preserved/i)).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Manual assignment' })).not.toBeNull();
    expect(screen.getByText(/Nothing changes until you choose Apply reviewed paste/i)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Apply reviewed paste' })).not.toBeNull();
    expect(screen.queryByText(/Discard local review edits/)).toBeNull();
  });

  it('uses native tab order without positive tab indexes', () => {
    renderReview();
    selectPassage('Remember the lighthouse motif.');
    const dialog = screen.getByRole('dialog');
    const positiveTabIndexes = dialog.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])');
    const nativeControls = [...dialog.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), button:not([disabled])')];

    expect(positiveTabIndexes.length).toBe(0);
    expect(nativeControls.length).toBeGreaterThan(8);
    expect(nativeControls.every((control) => control.tabIndex === 0)).toBe(true);
    expect(nativeControls[0]).toBe(screen.getByRole('checkbox', { name: "Don't show these tips again" }));
    expect(nativeControls.indexOf(screen.getByRole('combobox', { name: 'Assign selected to' }))).toBeLessThan(
      nativeControls.indexOf(screen.getByRole('button', { name: 'Assign selected passages' })),
    );
    expect(nativeControls.indexOf(screen.getByRole('button', { name: 'Assign selected passages' }))).toBeLessThan(
      nativeControls.indexOf(screen.getByRole('checkbox', { name: 'Select all passages' })),
    );
    nativeControls.slice(0, 4).forEach((control) => {
      control.focus();
      expect(document.activeElement).toBe(control);
    });
  });

  it('does not touch browser storage or APIs and keeps exact original text after local reassignment', () => {
    const storageGet = vi.spyOn(Storage.prototype, 'getItem');
    const storageSet = vi.spyOn(Storage.prototype, 'setItem');
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const xhrOpen = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const diagnostic = createDiagnostic();
    const originalText = `${diagnostic.originalText}\n  trailing source whitespace  `;
    const exactDiagnostic = { ...diagnostic, originalText };
    const onKeepUnstructured = vi.fn();

    try {
      renderReview({ diagnostic: exactDiagnostic, onKeepUnstructured });
      selectPassage('Remember the lighthouse motif.');
      chooseAssignment('notes');
      fireEvent.click(screen.getByRole('button', { name: 'Assign selected passages' }));
      fireEvent.click(screen.getByRole('button', { name: 'Keep as unstructured source' }));

      expect(onKeepUnstructured).toHaveBeenCalledWith(originalText);
      expect(storageGet).not.toHaveBeenCalled();
      expect(storageSet).not.toHaveBeenCalled();
      expect(storageRemove).not.toHaveBeenCalled();
      expect(storageClear).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrOpen).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
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

  it('places a sticky assignment toolbar before a long passage list with sticky summary and footer actions', () => {
    const diagnostic = analyzeOutlinePaste(Array.from(
      { length: 32 },
      (_, index) => `Loose passage ${index + 1}.`,
    ).join('\n'));
    renderReview({ diagnostic });
    const toolbar = screen.getByTestId('assignment-toolbar');
    const passages = screen.getByRole('region', { name: 'Recognized passages' });
    const sidebar = screen.getByTestId('paste-review-sidebar');
    const footer = screen.getByTestId('paste-review-footer');

    expect(toolbar.compareDocumentPosition(passages) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toolbar.className).toMatch(/lg:sticky/);
    expect(sidebar.className).toMatch(/lg:sticky/);
    expect(footer.className).toMatch(/sticky/);
    expect(screen.getByRole('dialog').className).not.toMatch(/overflow-x-auto|h-screen|max-h-\[/);
    expect(screen.getAllByRole('checkbox').filter((checkbox) => checkbox.getAttribute('aria-labelledby'))).toHaveLength(32);
  });

  it('integrates mobile selection actions into the single sticky footer without competing bottom layers', () => {
    const diagnostic = analyzeOutlinePaste(Array.from(
      { length: 32 },
      (_, index) => `Loose passage ${index + 1}.`,
    ).join('\n'));
    renderReview({ diagnostic });
    selectPassage('Loose passage 24.');

    const mobileBar = screen.getByTestId('mobile-assignment-bar');
    expect(mobileBar.className).toMatch(/md:hidden/);
    expect(within(mobileBar).getByText(/1 selected/)).not.toBeNull();
    expect(within(mobileBar).getByText(/Destination: Notes/)).not.toBeNull();
    expect(within(mobileBar).getByRole('link', { name: 'Edit assignment options' }).getAttribute('href')).toBe('#paste-review-assign-title');
    expect((within(mobileBar).getByRole('button', { name: 'Assign selected passages from mobile action bar' }) as HTMLButtonElement).disabled).toBe(false);
    const footer = screen.getByTestId('paste-review-footer');
    const primaryActions = screen.getByTestId('paste-review-actions');
    const bottomOwners = [...screen.getByRole('dialog').querySelectorAll<HTMLElement>('[class]')].filter((element) => (
      /(?:^|\s)(?:fixed|sticky)(?:\s|$)/.test(element.className) && /(?:^|\s)bottom-/.test(element.className)
    ));
    expect(footer.contains(mobileBar)).toBe(true);
    expect(footer.className).toMatch(/z-30/);
    expect(bottomOwners).toEqual([footer]);
    expect(mobileBar.compareDocumentPosition(primaryActions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mobileBar.querySelector('[id]')).toBeNull();
    expect(within(mobileBar).getByRole('link', { name: 'Edit assignment options' }).tabIndex).toBe(0);
    expect(within(mobileBar).getByRole('button', { name: 'Assign selected passages from mobile action bar' }).tabIndex).toBe(0);
  });

  it('uses at least text-xs for functional labels and metadata', () => {
    renderReview();
    const dialog = screen.getByRole('dialog');
    const undersized = [...dialog.querySelectorAll<HTMLElement>('[class]')].filter((element) => (
      element.className.includes('text-[0.68rem]')
    ));
    expect(undersized).toHaveLength(0);
  });

  it('keeps narrow-screen visual action order aligned with DOM and tab order', () => {
    renderReview();
    const actions = screen.getByTestId('paste-review-actions');
    const labels = [...actions.querySelectorAll('button')].map((button) => button.textContent?.trim());

    expect(actions.className).toContain('flex-col');
    expect(actions.className).not.toContain('flex-col-reverse');
    expect(labels).toEqual([
      'Cancel — keep current outline',
      'Keep as unstructured source',
      'Apply reviewed paste',
    ]);
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
