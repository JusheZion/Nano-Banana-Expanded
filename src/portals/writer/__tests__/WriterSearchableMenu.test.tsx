import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterSearchableMenu } from '@/portals/writer/WriterPortal';

describe('WriterSearchableMenu', () => {
  it('wires its combobox to a keyboard-navigable listbox', () => {
    const onChange = vi.fn();
    render(
      <WriterSearchableMenu
        label="Series"
        value={null}
        onChange={onChange}
        options={[
          { id: 'series-1', label: 'First story' },
          { id: 'series-2', label: 'Second story', meta: 'A sequel' },
        ]}
        placeholder="Search series"
        ariaLabel="Select Writer series"
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Select Writer series' });
    fireEvent.focus(input);
    const listbox = screen.getByRole('listbox', { name: 'Series options' });
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(input.getAttribute('aria-autocomplete')).toBe('list');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const firstOption = screen.getByRole('option', { name: 'First story' });
    expect(input.getAttribute('aria-activedescendant')).toBe(firstOption.id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('series-1');
  });

  it('announces an empty search result', () => {
    render(
      <WriterSearchableMenu
        label="Issue"
        value={null}
        onChange={vi.fn()}
        options={[]}
        placeholder="Search issues"
        ariaLabel="Select Writer issue"
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Select Writer issue' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'missing' } });
    expect(screen.getByRole('status').textContent).toContain('No matches');
  });
});
