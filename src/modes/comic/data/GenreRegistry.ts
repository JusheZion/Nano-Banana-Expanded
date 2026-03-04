export type GenreId =
    | 'none'
    | 'hardboiled_noir'
    | 'afrofuturism'
    | 'celestial_romance'
    | 'mythic_odyssey'
    | 'cyberpunk'
    | 'shonen_action'
    | 'custom';

export interface Genre {
    id: GenreId;
    label: string;
    description: string;
    fontFamily: string;
    palette: {
        border: string;
        background: string;
        glow: string;
    };
    uiAccent: string;
    aiBias: string;
    textureId?: string;
    textureOpacity?: number;
}

export const GENRE_REGISTRY: Genre[] = [
    {
        id: 'none',
        label: 'Default Studio',
        description: 'A clean, unopinionated blank slate for any comic style.',
        fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
        palette: {
            border: '#000000',
            background: '#ffffff',
            glow: '#00000000'
        },
        uiAccent: 'from-blue-500 to-indigo-600',
        aiBias: ''
    },
    {
        id: 'afrofuturism',
        label: 'Afrofuturism',
        description: 'Vibrant Pan-African aesthetics, advanced technology, and deep historical roots.',
        fontFamily: '"Orbitron", "Exo 2", sans-serif',
        palette: {
            border: '#F5A623',   // Golden yellow
            background: '#1A0B2E', // Deep regal purple/space black
            glow: '#4A90E288'    // Techno blue glow
        },
        uiAccent: 'from-amber-500 to-purple-600',
        aiBias: 'in the style of Afrofuturism, featuring advanced African-inspired technology, vibrant pan-African patterns, regal futuristic clothing, bioluminescence, and a blend of ancestral roots with high-tech sci-fi environments'
    },
    {
        id: 'celestial_romance',
        label: 'Celestial Romance',
        description: 'Soft, ethereal, shoujo-inspired magical atmospheres with emotional depth.',
        fontFamily: '"Playfair Display", "Times New Roman", serif',
        palette: {
            border: '#F48FB1', // Soft pink
            background: '#FFFAFA', // Snow white
            glow: '#FFF0F588'  // Lavender blush
        },
        uiAccent: 'from-pink-400 to-rose-300',
        aiBias: 'in the style of classic shoujo manga romance, soft ethereal lighting, cherry blossoms, sparkling magical atmosphere, expressive eyes, delicate linework, pastel tones, emotional and dreamlike'
    },
    {
        id: 'cyberpunk',
        label: 'Cyberpunk',
        description: 'Neon-drenched dystopian megacities, cyberware, and hacker undergrounds.',
        fontFamily: '"Rajdhani", "Share Tech Mono", sans-serif',
        palette: {
            border: '#00FF41', // Matrix green
            background: '#0D0208', // Void black
            glow: '#FF003C88'  // Neon red
        },
        uiAccent: 'from-emerald-400 to-cyan-500',
        aiBias: 'in the style of dystopian cyberpunk anime concept art, neon-drenched rainy megacity streets, cybernetic augmentations, hologram billboards, gritty futuristic tech, synthwave color palette'
    },
    {
        id: 'hardboiled_noir',
        label: 'Hardboiled Noir',
        description: 'Gritty, high-contrast black and white detective fiction.',
        fontFamily: '"Courier New", Courier, monospace',
        palette: {
            border: '#000000',
            background: '#222222',
            glow: '#FFFFFF44'
        },
        uiAccent: 'from-zinc-700 to-zinc-900',
        aiBias: 'in the style of gritty 1940s film noir comic art, high-contrast stark lighting, heavy shadows, chiaroscuro, cinematic angles, rainy streets, monochrome black and white with dramatic lighting'
    },
    {
        id: 'mythic_odyssey',
        label: 'Mythic Odyssey',
        description: 'Epic high-fantasy, ancient ruins, magic overhauls, and legendary beasts.',
        fontFamily: '"Cinzel", "Garamond", serif',
        palette: {
            border: '#8B4513', // Saddle brown 
            background: '#FDF5E6', // Old parchment
            glow: '#FFD70088'  // Golden magic
        },
        uiAccent: 'from-amber-600 to-emerald-700',
        aiBias: 'in the style of epic high-fantasy comic art, featuring ancient mythical ruins, intricate magical glowing runes, legendary creatures, swords and sorcery, heroic dynamic poses, lush magical forests'
    },
    {
        id: 'shonen_action',
        label: 'Shonen Action',
        description: 'High-octane manga battles, speed lines, and extreme dynamic perspectives.',
        fontFamily: '"Bangers", "Impact", sans-serif',
        palette: {
            border: '#FF0000', // Pure red
            background: '#FFFFFF', // White
            glow: '#FFA500aa'  // Orange impact
        },
        uiAccent: 'from-red-600 to-orange-500',
        aiBias: 'in the style of high-octane shonen action manga cover art, extreme dynamic perspective, intense battle auras, dramatic speed lines, muscular high-energy poses, stylized explosive impacts'
    },
    {
        id: 'custom',
        label: 'Custom Theme',
        description: 'Your own personalized theme settings.',
        fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
        palette: {
            border: '#000000',
            background: '#ffffff',
            glow: '#00000000'
        },
        uiAccent: 'from-zinc-500 to-zinc-600',
        aiBias: ''
    }
];
