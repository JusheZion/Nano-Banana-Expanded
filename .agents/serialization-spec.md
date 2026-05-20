Objective: Implement a "Smart Default" system for AI image generation that ensures representation without limiting creative freedom.

1. The "Unless Specified" Logic Flow
The prompt middleware must follow a strict priority hierarchy:

Direct User Input: If the prompt contains specific descriptors (e.g., "Caucasian," "Asian," "Old woman"), the system must not append any defaults.

Smart Default (The Baseline): If the prompt is generic (e.g., "A starship pilot") and the Inclusive Bias Toggle is ON, append the Demographic Focus string from Project Settings.

2. Settings UI Requirements
In the Project Settings sidebar, implement the following:

Toggle: inclusiveBiasEnabled (Boolean).

Demographic Focus: biasString (Text field, Default: "African-American or Blatino man").

3. Example Middleware (Pseudocode)
TypeScript
const generatePrompt = (userInput, settings) => {
  const identityKeywords = ['white', 'black', 'man', 'woman', 'hispanic', ...];
  const hasSpecifics = identityKeywords.some(kw => userInput.toLowerCase().includes(kw));

  if (!hasSpecifics && settings.inclusiveBiasEnabled) {
    return `${userInput}, ${settings.biasString}`;
  }
  return userInput;
};
4. Versatility Assurance
Ensure the system is Genre-Agnostic. If the user creates a "Victorian Noir" project, they should be able to change the biasString to "diverse 1940s cast" or toggle it OFF entirely.