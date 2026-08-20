/**
 * Regression tests for the shared form controls in the comic ribbon.
 *
 * Both bugs covered here were dead ends rather than crashes, which is why they survived: the UI
 * looked fine and simply refused to do the thing you asked.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FontSelect } from '../FontSelect';
import { PrecisionSlider } from '../PrecisionSlider';

describe('FontSelect', () => {
    it('lists the registry and reports the current font', () => {
        render(<FontSelect value="Bangers" onChange={() => {}} />);
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('Bangers');
        expect(screen.getByRole('option', { name: 'Cinzel' })).toBeTruthy();
    });

    it('emits the chosen font', () => {
        const onChange = vi.fn();
        render(<FontSelect value="Bangers" onChange={onChange} />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Cinzel' } });
        expect(onChange).toHaveBeenCalledWith('Cinzel');
    });

    /**
     * REGRESSION. Choosing "Custom…" used to `return` without changing anything, so the select
     * snapped back to the known font and the freeform input — which only rendered when the current
     * font was NOT in the registry — never appeared. There was no route from a known font to a
     * custom one at all.
     */
    it('reveals the freeform input when Custom is chosen from a known font', () => {
        render(<FontSelect value="Bangers" onChange={() => {}} />);
        expect(screen.queryByLabelText('Custom font family')).toBeNull();

        fireEvent.change(screen.getByRole('combobox'), { target: { value: '__custom' } });
        expect(screen.getByLabelText('Custom font family')).toBeTruthy();
    });

    it('lets the user type a custom family once revealed', () => {
        const onChange = vi.fn();
        render(<FontSelect value="Bangers" onChange={onChange} />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '__custom' } });
        fireEvent.change(screen.getByLabelText('Custom font family'), {
            target: { value: '"Cinzel Decorative", serif' },
        });
        expect(onChange).toHaveBeenCalledWith('"Cinzel Decorative", serif');
    });

    it('shows the freeform input for a font already outside the registry', () => {
        render(<FontSelect value='"Something Bespoke", serif' onChange={() => {}} />);
        expect(screen.getByLabelText('Custom font family')).toBeTruthy();
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('__custom');
    });

    it('leaves custom mode when a registry font is picked again', () => {
        const onChange = vi.fn();
        const { rerender } = render(<FontSelect value="Bangers" onChange={onChange} />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '__custom' } });
        expect(screen.getByLabelText('Custom font family')).toBeTruthy();

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Roboto' } });
        rerender(<FontSelect value="Roboto" onChange={onChange} />);
        expect(screen.queryByLabelText('Custom font family')).toBeNull();
    });

    it('omits the custom option when allowCustom is off', () => {
        render(<FontSelect value="Bangers" onChange={() => {}} allowCustom={false} />);
        expect(screen.queryByRole('option', { name: 'Custom…' })).toBeNull();
    });
});

describe('PrecisionSlider', () => {
    it('snaps a change to the nearest step', () => {
        const onChange = vi.fn();
        render(<PrecisionSlider min={0} max={100} step={10} value={50} onChange={onChange} aria-label="Zoom" />);
        fireEvent.change(screen.getByLabelText('Zoom'), { target: { value: '63' } });
        expect(onChange).toHaveBeenCalledWith(60);
    });

    it('clamps to the declared range', () => {
        const onChange = vi.fn();
        render(<PrecisionSlider min={0} max={100} step={10} value={50} onChange={onChange} aria-label="Zoom" />);
        fireEvent.change(screen.getByLabelText('Zoom'), { target: { value: '999' } });
        expect(onChange).toHaveBeenCalledWith(100);
    });

    /** REGRESSION: an unparseable value produced NaN, which reached the store as a NaN dimension. */
    it('never emits a non-finite value', () => {
        const onChange = vi.fn();
        render(<PrecisionSlider min={0} max={100} step={10} value={50} onChange={onChange} aria-label="Zoom" />);
        fireEvent.change(screen.getByLabelText('Zoom'), { target: { value: '' } });
        for (const [emitted] of onChange.mock.calls) {
            expect(Number.isFinite(emitted)).toBe(true);
        }
    });

    it('steps with the increment and decrement buttons', () => {
        const onChange = vi.fn();
        render(<PrecisionSlider min={0} max={100} step={10} value={50} onChange={onChange} aria-label="Zoom" />);
        fireEvent.click(screen.getByLabelText('Increase'));
        expect(onChange).toHaveBeenLastCalledWith(60);
        fireEvent.click(screen.getByLabelText('Decrease'));
        expect(onChange).toHaveBeenLastCalledWith(40);
    });

    it('disables the buttons at each end of the range', () => {
        const { rerender } = render(
            <PrecisionSlider min={0} max={100} step={10} value={0} onChange={() => {}} aria-label="Zoom" />,
        );
        expect((screen.getByLabelText('Decrease') as HTMLButtonElement).disabled).toBe(true);
        rerender(<PrecisionSlider min={0} max={100} step={10} value={100} onChange={() => {}} aria-label="Zoom" />);
        expect((screen.getByLabelText('Increase') as HTMLButtonElement).disabled).toBe(true);
    });
});
