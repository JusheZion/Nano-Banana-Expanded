# Design System: Nano Banana Expanded
**Project ID:** 954412538784398355

## 1. Visual Theme & Atmosphere
The design language is **"Jewel-Tone Glassmorphism"**. It evokes a premium, crystalline, and immersive feeling. Imagine looking through polished gemstones (ruby, emerald, amethyst) with soft, inner light. The interface is deep, not flat. Depth is achieved through layering glass panels with varying blur and opacity over rich, dark, saturated backgrounds. It feels responsive, fluid, and "alive".

## 2. Color Palette & Roles
*   **Crimson (#893741)**: Functional Role: **Hub Accent & Active State**. Used for the primary navigation hub, active tab indicators, and critical alerts. It represents the core energy of the system.
*   **Deep Teal (#37615D)**: Functional Role: **Studio & Lab Context**. Used as the primary background and accent for "Creation" and "Editing" modes (Portal 1 & 4). It promotes focus and calm precision.
*   **Royal Purple (#5F368E)**: Functional Role: **Album & Story Context**. Used for "viewing" and "sequencing" modes (Portal 2 & 3). It represents creativity, fantasy, and the richness of the image library.
*   **Obsidian (#0F0F12)**: Functional Role: **Base Background**. The deepest layer, sitting behind all glass panels.
*   **Crystalline White (#FFFFFF with opacity)**: Functional Role: **Text & Glass Highlights**. Used for text (various opacities) and the subtle borders/sheen on glass cards.

## 3. Typography Rules
*   **Font Family**: `Inter` or `Outfit` (Modern Sans-Serif). Clean, geometric, highly legible.
*   **Headers**: Bold weight (700), tight letter-spacing (-0.02em). Uppercase for section labels.
*   **Body**: Regular weight (400), comfortable line-height (1.5).
*   **Monospace**: `JetBrains Mono` or `Fira Code` for prompt text areas, emphasizing the "code/data" aspect of prompt engineering.

## 4. Component Stylings
*   **Glass Cards**:
    *   **Appearance**: Translucent backgrounds (e.g., `bg-white/5` or `bg-black/20`).
    *   **Blur**: `backdrop-blur-md` (12px) to `backdrop-blur-xl` (24px).
    *   **Border**: 1px solid `border-white/10` to `border-white/20`.
    *   **Shadow**: Soft, diffused shadows (`shadow-lg`, colored by context).
    *   **Hover**: Brightens slightly, border glows (`border-white/40`), subtle lift (`-translate-y-1`).
*   **Buttons**:
    *   **Primary**: Solid jewel tone (Crimson/Teal/Purple) with inner glow. Pill-shaped (`rounded-full`).
    *   **Secondary**: Glass style (`bg-white/10`) with hover fill.
*   **Inputs (Prompt Bar)**:
    *   **Style**: Deep, semi-transparent backgrounds (`bg-black/30`).
    *   **Focus**: Neon glow border matched to the active portal color.
*   **Tags/Chips**:
    *   **Shape**: Pill-shaped (`rounded-full`).
    *   **Interactive**: Clickable.
    *   **States**:
        *   **Positive**: Solid Green/Teal.
        *   **Negative**: Solid Red.
        *   **Neutral**: Outline/Ghost.

## 5. Layout Principles
*   **Spacing**: Generous usage of whitespace (padding-6 to padding-12) to let the "glass" breathe.
*   **Grid**: 12-column grid for dashboards. Masonry packing for image galleries.
*   **Alignment**: Central focus for detailed views (Studio/Lab). Wide, panoramic checks for Albums.
