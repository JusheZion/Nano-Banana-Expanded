/**
 * Logic to compile tags and text into a final prompt string.
 */

export interface ChipTag {
    id: string;
    text: string;
    polarity: 'positive' | 'negative' | 'neutral'; // Tier 1, 2, 3
}

export const PromptCompiler = {
    hyphenate: (text: string): string => {
        if (!text) return '';
        return text.trim().replace(/\s+/g, '-').toLowerCase();
    },

    compile: (chips: ChipTag[], manualInput: string): string => {
        const activeChips = chips.filter(c => c.polarity !== 'neutral');
        const chipStrings = activeChips.map(c => c.text);
        const manualParts = manualInput.split(',').map(s => s.trim()).filter(s => s).map(s => PromptCompiler.hyphenate(s));
        return [...chipStrings, ...manualParts].join(', ');
    }
};
