# Technical Spec: Genre Presets & Thematic Engine

## 1. Objective
Create a "Theme Layer" that globally updates the studio's aesthetic and AI logic based on the selected genre. This must be a one-click operation that modifies the `ProjectTemplate` state.

## 2. The Preset Schema
Each preset in the `GenreRegistry.json` (to be created) should define four key vectors:

| Preset Key | Attributes |
| :--- | :--- |
| **Typography** | Default font for Speech Balloons, Text Boxes, and Sound Effects. |
| **Palette** | Default Border Color, Background Color, and Accent Glow color. |
| **UI Aesthetic** | Changes to the UI ribbon accent color to match the genre mood. |
| **AI Bias** | Environmental keywords (e.g., "starships, neon" vs "parchment, magic"). |

## 3. The "Smart Bias" Stack
The Genre Preset must work in tandem with the **Inclusive Bias** logic from `inclusive-logic-spec.md`. 

### Prompt Construction Logic:
`[User Prompt] + [Demographic Focus] + [Genre Environmental Bias]`

*Example (Sci-Fi Preset):*
- **User:** "A captain in his quarters."
- **Demographic:** "African-American or Blatino man."
- **Genre Bias:** "Cinematic sci-fi lighting, futuristic interior, starship viewport."
- **Final:** "A captain in his quarters, African-American or Blatino man, cinematic sci-fi lighting, futuristic interior, starship viewport."

## 4. UI Implementation
- **The Theme Switcher:** Located in the "Project Settings" section of the top ribbon.
- **Visual Preview:** Clicking a genre should show a "Mini-Card" preview of the font and color palette before applying.
- **Persistence:** The selected genre must be saved in the `projectInfo` block of the JSON export.

## 5. Initial Registry Definitions
- **Sci-Fi Fantasy (Default):** Font: *Orbitron/Exo 2*; Palette: *Cyber Cyan/Deep Purple*; Bias: *Neon, starships, technological.*
- **Gothic Noir:** Font: *Courier Prime/MedievalSharp*; Palette: *Charcoal/Crimson*; Bias: *Heavy shadows, rainy, atmospheric.*
- **High Fantasy:** Font: *Cinzel/Almendra*; Palette: *Gold/Parchment/Forest Green*; Bias: *Ethereal, magical, ornate armor.*