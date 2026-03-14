/**
 * Reference Character Studio: spec-driven option lists.
 * Single source for Art Style, DNA (Heritage/Gender), Surgical Physical, Wardrobe, Cinematic.
 */

export const ART_STYLE_FLAGSHIP = 'Smooth Animated 3D/CGI Render';

export const ART_STYLE_LIBRARY = [
  '2D Vector Art',
  'Cinematic Oil Painting',
  'Hyper-Realistic Photo',
  'Manga/Anime',
  'Cyberpunk Neon',
  'Noir Sketch',
  'Watercolor',
  '8-bit Pixel Art',
  'Claymation',
] as const;

export const HERITAGE_TAGS = [
  'West African',
  'East African',
  'Central African',
  'Southern African',
  'Afro-Caribbean',
  'Afro-Latino',
  'Blatino',
  'African-American',
  'Native American',
  'First Nations',
  'Aboriginal Australian',
  'Māori',
  'East Asian',
  'Southeast Asian',
  'South Asian',
  'Pacific Islander',
  'Levantine',
  'Maghrebi',
  'Persian',
  'Arab',
  'Mestizo',
  'Indigenous Latino',
  'European-Latino',
  'Northern European',
  'Southern European',
  'Eastern European',
  'Western European',
  'Mixed Heritage',
] as const;

export const GENDER_TAGS = [
  'Cisgender Man',
  'Cisgender Woman',
  'Non-Binary',
  'Genderfluid',
  'Androgynous',
  'Bigender',
  'Trans Man',
  'Trans Woman',
  'Masculine',
  'Virile',
  'Neutral',
  'Soft',
  'Feminine',
  'Delicate',
] as const;

/** DNA weight boost: +15% for these when unselected */
export const DNA_WEIGHTED_HERITAGE = ['African-American', 'Blatino'] as const;

export const SURGICAL_PHYSICAL = {
  height: [
    'Towering',
    'Statuesque',
    'Tall',
    'Average',
    'Short',
    'Diminutive',
  ] as const,
  bodyType: [
    'Burly',
    'Stocky',
    'Athletic',
    'Toned',
    'Average',
    'Slim',
    'Slender',
    'Lithe',
  ] as const,
  skinTone: [
    'Deepest Ebony',
    'Obsidian',
    'Deep-umber',
    'Rich Mahogany',
    'Bronze',
    'Golden',
    'Honey',
    'Tawny',
    'Olive',
    'Porcelain',
    'Alabaster',
  ] as const,
  faceShape: ['Chiseled', 'Sharp', 'Oval', 'Rounded'] as const,
  jawline: ['Hammered', 'Sharp', 'Strong', 'Receding'] as const,
  nose: ['Wide', 'Nubian', 'Flared', 'Aquiline', 'Straight', 'Pointed'] as const,
  chin: ['Jutting', 'Cleft', 'Squared', 'Pointed'] as const,
  cheekbones: ['Prominent', 'High', 'Sculpted', 'Smooth'] as const,
  lips: ['Bee-stung', 'Plush', 'Pouty', 'Thin'] as const,
  eyebrows: ['Bushy', 'Thick', 'Arched', 'Thin'] as const,
  eyelashes: ['Fluttery', 'Long', 'Thick', 'Natural'] as const,
  facialHair: [
    'Rugged',
    'Full-beard',
    'Goatee',
    'Shadow',
    'Clean-shaven',
  ] as const,
  hairTexture: [
    '4C Coily',
    '4A/B Kinky',
    '3A/B Curly',
    'Wavy',
    'Straight',
  ] as const,
  hairStyle: [
    'Braided',
    'Cornrows',
    'Locs',
    'Pompadour',
    'Undercut',
    'Fade',
    'Taper',
    'Bald',
  ] as const,
  hairColor: [
    'Midnight',
    'Espresso',
    'Chestnut',
    'Auburn',
    'Platinum',
  ] as const,
} as const;

export type SurgicalPhysicalKey = keyof typeof SURGICAL_PHYSICAL;

export const WARDROBE_PRESETS = {
  style: [
    '1990s Urban',
    'Business Casual',
    'Superhero Costume',
    'Cyberpunk',
    'Afrofuturist',
    'Techwear',
    'Streetwear',
    'High Fantasy',
    'Royal Regalia',
  ] as const,
  tops: [
    'Oversized Hoodie',
    'Tailored Blazer',
    'Tactical Vest',
    'Silk Blouse',
    'Crop Top',
    'Turtleneck',
    'Muscle Tank',
    'Tunic',
  ] as const,
  bottoms: [
    'Distressed Denim',
    'Cargo Pants',
    'Pleated Slacks',
    'Joggers',
    'Leather Trousers',
    'Biker Shorts',
    'Hakama',
  ] as const,
  outerwear: [
    'Trench Coat',
    'Bomber Jacket',
    'Puffer Jacket',
    'Cape/Cloak',
    'Duster',
    'Windbreaker',
  ] as const,
  shoes: [
    'High-top Sneakers',
    'Combat Boots',
    'Chelsea Boots',
    'Tech-sandals',
    'Stilettos',
    'Oxfords',
  ] as const,
  accessories: [
    'Gold Chain',
    'Utility Belt',
    'Smart Watch',
    'Fingerless Gloves',
    'Studded Bracelet',
    'Scarf',
    'Bowtie',
  ] as const,
  hats: [
    'Snapback',
    'Beanie',
    'Fedora',
    'Beret',
    'Durag',
    'Crown',
    'Hood',
    'Turban',
  ] as const,
  glasses: [
    'Aviators',
    'Wayfarers',
    'Tech-Visor',
    'Wire-rimmed',
    'Cyber-goggles',
    'Monocle',
  ] as const,
  material: [
    'Matte Carbon Fiber',
    'Iridescent Silk',
    'Distressed Leather',
    'High-gloss Latex',
    'Metallic Foil',
    'Brushed Suede',
    'Heavy Denim',
  ] as const,
} as const;

export type WardrobeCategory = keyof typeof WARDROBE_PRESETS;

export const CINEMATIC_OPTIONS = {
  angle: ['Low', 'High', "Bird's Eye", 'Dutch'] as const,
  lighting: [
    'Three-point softbox',
    'Golden Hour',
    'Neon',
    'Chiaroscuro',
  ] as const,
  tone: ['Melancholic', 'Heroic', 'Suspenseful', 'Gritty'] as const,
  location: [
    'Cyberpunk Slum',
    'High-Tech Lab',
    'Ancient Temple',
  ] as const,
} as const;

export type CinematicKey = keyof typeof CINEMATIC_OPTIONS;

export type AspectRatioId = '9:16' | '1:1' | '21:9';
