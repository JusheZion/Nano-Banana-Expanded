export interface PromptSettings {
    inclusiveBiasEnabled: boolean;
    demographicFocus: string;
}

export const generatePrompt = (userInput: string, settings: PromptSettings): string => {
    // Common identity keywords that signify the user already specified demographics
    const identityKeywords = [
        'white', 'black', 'man', 'woman', 'hispanic', 'asian', 'latino', 'latina',
        'boy', 'girl', 'male', 'female', 'old', 'young', 'child', 'elderly', 'teen'
    ];

    const lowerInput = userInput.toLowerCase();
    const hasSpecifics = identityKeywords.some(kw => lowerInput.includes(kw));

    if (!hasSpecifics && settings.inclusiveBiasEnabled && settings.demographicFocus) {
        // Append the bias string
        return `${userInput}, ${settings.demographicFocus}`;
    }

    return userInput;
};
