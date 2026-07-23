import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterOutlinePasteSettings } from '../WriterOutlinePasteSettings';
import {
  DEFAULT_OUTLINE_PASTE_PREFERENCES,
  type OutlinePastePreferences,
} from '../writerOutlinePastePreferences';

function SynchronizedSettingsHarness() {
  const [value, setValue] = useState<OutlinePastePreferences>({
    ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
  });
  return (
    <>
      <WriterOutlinePasteSettings
        surface="local"
        idPrefix="local-paste"
        value={value}
        onChange={setValue}
      />
      <WriterOutlinePasteSettings
        surface="story"
        idPrefix="story-paste"
        value={value}
        onChange={setValue}
      />
    </>
  );
}

describe('WriterOutlinePasteSettings', () => {
  it('keeps local and Story Settings controls synchronized through one controlled value', () => {
    render(<SynchronizedSettingsHarness />);

    fireEvent.change(screen.getByLabelText('Review pasted outlines', { selector: '#local-paste-review-frequency' }), {
      target: { value: 'always' },
    });
    expect((screen.getByLabelText('Review pasted outlines', { selector: '#story-paste-review-frequency' }) as HTMLSelectElement).value).toBe('always');

    fireEvent.change(screen.getByLabelText('AI classification', { selector: '#story-paste-ai-classification' }), {
      target: { value: 'suggest' },
    });
    expect((screen.getByLabelText('AI classification', { selector: '#local-paste-ai-classification' }) as HTMLSelectElement).value).toBe('suggest');
  });

  it('uses unique explicit IDs when both surfaces are mounted', () => {
    render(<SynchronizedSettingsHarness />);
    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels AI modes as optional and can reset first-use guidance', () => {
    const onChange = vi.fn();
    render(
      <WriterOutlinePasteSettings
        surface="story"
        idPrefix="story"
        value={{ ...DEFAULT_OUTLINE_PASTE_PREFERENCES, showFirstUseGuidance: false }}
        onChange={onChange}
      />,
    );

    expect(screen.getByText(/AI is optional.*never rewrite source text/i)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset first-use guidance' }));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
      showFirstUseGuidance: true,
    });
  });
});
