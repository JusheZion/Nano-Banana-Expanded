import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WriterOutlineTreatmentDiff } from '../WriterOutlineTreatmentDiff';

describe('WriterOutlineTreatmentDiff', () => {
  it('renders unchanged text without highlighting', () => {
    render(<WriterOutlineTreatmentDiff original="The fire crackles." proposed="The fire crackles." />);
    expect(screen.queryByText('The fire crackles.', { selector: 'mark' })).toBeNull();
  });

  it('highlights proposed-only wording accessibly', () => {
    render(
      <WriterOutlineTreatmentDiff
        original="The fire crackles."
        proposed="The ancient fire crackles brightly."
      />,
    );
    expect(document.querySelectorAll('mark').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Proposed wording with changes highlighted').textContent)
      .toContain('ancient');
  });

  it('uses whole-field highlighting for very long text', () => {
    const proposed = `Changed ${'word '.repeat(500)}`;
    render(<WriterOutlineTreatmentDiff original="Original" proposed={proposed} />);
    expect(document.querySelectorAll('mark')).toHaveLength(1);
  });
});
