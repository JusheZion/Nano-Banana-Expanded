/**
 * Logic to compile tags and text into a final prompt string.
 */

export interface ChipTag {
    id: string;
    text: string;
    polarity: 'positive' | 'negative' | 'neutral'; // Tier 1, 2, 3
}

export const PromptCompiler = {
    /**
     * Converts a user entered string into a hyphenated tag format
     * e.g. "warm brown eyes" -> "warm-brown-eyes"
     */
    hyphenate: (text: string): string => {
        if (!text) return '';
        return text.trim().replace(/\s+/g, '-').toLowerCase();
    },

    /**
     * Compiles active chips and manual input into a comma-separated string.
     * Only includes positive and negative tags (neutral are ignored/off).
     * Negative tags might need special handling (e.g. "--no" prefix or separate negative prompt).
     * For this app, we'll assume a single string where negative tags might be prefixed or handled by the AI model.
     * But usually AI models take "positive" and "negative" prompts separately.
     * The requirement says: "Prompt Compiler: Logic to join all active chips/text into a single, comma-separated string."
     * It implies a single field.
     * 
     * However, 3-tier polarity usually implies:
     * Pos: Weight 1
     * Neg: Weight -1 (Negative prompt)
     * Neu: Weight 0 (Off)
     * 
     * Integrating into a single string might be: "tag1, tag2, --no tag3" if the model supports it.
     * Or just listing them.
     * The user requirement says "join all active chips/text into a single, comma-separated string."
     * I will stick to that.
     * If polarity is negative, maybe prefix with "no "? Or just include it?
     * The "3-tier polarity tables" usually means: Include / Exclude / Ignore.
     * If "Exclude" (Negative), it should probably be in a negative prompt.
     * But if the requirement says "single ... string", I'll provide a method that returns { positive, negative } or a single string with syntax.
     * Let's assume standard Stable Diffusion syntax: "positive prompt" and "negative prompt".
     * But if the UI has one text box output...
     * Let's look at the requirement again: "Prompt Compiler: Logic to join all active chips/text into a single, comma-separated string."
     * Maybe it just joins active ones.
     * Weighting/Negatives might be handled by syntax like "(tag)" or "[tag]".
     * I will implement a basic joiner that handles positive tags.
     * And maybe distinct handling for negative if needed.
     * For now, I'll join positive tags.
     * Negative tags: maybe append to the end with "no [tag]" or just return a separate string?
     * "Single string" implies one output.
     * I'll assume for now it returns just the positive text, or comma separated values.
     * I'll create a `compile` function.
     */
    compile: (chips: ChipTag[], manualInput: string): string => {
        const activeChips = chips.filter(c => c.polarity !== 'neutral');

        // simple join for now, maybe handle polarity later if spec clarifies
        // For now, let's assume we just want the text of active chips + manual input
        // If polarity is negative, users often want it in a "Negative Prompt" field.
        // But if the request asks for a single string, maybe it's for a model that takes one prompt.
        // Or maybe "single ... string" refers to the *input* to the compiler?
        // "Prompt Compiler: Logic to join all active chips/text into a single, comma-separated string."
        // I will join all active chips (positive OR negative?)
        // Usually negative tags should be separated.
        // I will return an object with both, or a string representation that includes negatives?
        // I'll stick to a simple comma-separated string of *all* active tags (pos/neg) and let the user decide meaning, 
        // OR filter only positive.
        // Let's filter only Positive for the main string, unless specified otherwise.
        // Wait, "Hybrid Tag Bar ... 3-tier polarity".
        // If I ignore negative, then what's the point?
        // Maybe the single string is "uncompiled" or "compiled to syntax"? 
        // like "tag1, tag2, --neg tag3"?
        // I'll assume a standard format: "tag1, tag2". And maybe ignore negative for now or look for clarification.
        // Actually, I'll leave room for negative handling but implement joining of all non-neutral.

        // Let's hyphenate manual input parts if they look like tags? 
        // Requirement: "enter/comma to convert text to chips". 
        // So manual input is transient. The compiler takes the chips.
        // The `manualInput` arg might be the current text in the box which hasn't been converted yet? 
        // Usually compiler runs on *chips*.
        // If text remains in input, usually it's added.

        const chipStrings = activeChips.map(c => c.text); // Already hyphenated when created?

        // Hyphenate manual input if it's treated as a tag
        const manualParts = manualInput.split(',').map(s => s.trim()).filter(s => s).map(s => PromptCompiler.hyphenate(s));

        return [...chipStrings, ...manualParts].join(', ');
    }
};
