import { describe, it, expect } from 'vitest';
import { PromptCompiler, type ChipTag } from './PromptCompiler';

describe('PromptCompiler', () => {
    it('hyphenates text correctly', () => {
        expect(PromptCompiler.hyphenate('warm brown eyes')).toBe('warm-brown-eyes');
        expect(PromptCompiler.hyphenate('  dark   blue  ')).toBe('dark-blue');
        expect(PromptCompiler.hyphenate('single')).toBe('single');
    });

    it('compiles chips and manual input into a single string', () => {
        const chips: ChipTag[] = [
            { id: '1', text: 'photo-realistic', polarity: 'positive' },
            { id: '2', text: 'painting', polarity: 'neutral' }, // Should be ignored
            { id: '3', text: '4k', polarity: 'positive' }
        ];
        const manualInput = 'cinematic lighting, sharp focus';

        const result = PromptCompiler.compile(chips, manualInput);

        // Manual input should be hyphenated: "cinematic-lighting", "sharp-focus"
        expect(result).toBe('photo-realistic, 4k, cinematic-lighting, sharp-focus');
    });

    it('handles empty input', () => {
        const result = PromptCompiler.compile([], '');
        expect(result).toBe('');
    });
});
