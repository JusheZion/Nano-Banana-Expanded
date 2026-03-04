import { GENRE_REGISTRY } from '../data/GenreRegistry';

export interface PromptSettings {
    inclusiveBiasEnabled: boolean;
    demographicFocus: string;
    currentGenreId?: string;
}

export const generatePrompt = (userInput: string, settings: PromptSettings): string => {
    // Common identity keywords that signify the user already specified demographics
    const identityKeywords = [
        'white', 'black', 'man', 'woman', 'hispanic', 'asian', 'latino', 'latina',
        'boy', 'girl', 'male', 'female', 'old', 'young', 'child', 'elderly', 'teen'
    ];

    const lowerInput = userInput.toLowerCase();
    const hasSpecifics = identityKeywords.some(kw => lowerInput.includes(kw));

    let finalPrompt = userInput;

    if (!hasSpecifics && settings.inclusiveBiasEnabled && settings.demographicFocus) {
        // Append the identity bias string
        finalPrompt += `, ${settings.demographicFocus}`;
    }

    // Append Genre Bias
    if (settings.currentGenreId && settings.currentGenreId !== 'none') {
        const genre = GENRE_REGISTRY.find(g => g.id === settings.currentGenreId);
        if (genre && genre.aiBias) {
            finalPrompt += `, ${genre.aiBias}`;
        }
    }

    return finalPrompt;
};
