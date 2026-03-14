/**
 * Asset Reference Studio: spec-driven option lists.
 * Art Style, Era/Style, Location Type, Architectural Detail, Set Dressing, Cinematic, Spatial, Time/Season.
 */

export const ART_STYLE_FLAGSHIP = 'Smooth Animated 3D/CGI Render';

export const ART_STYLE_LIBRARY = [
  '2D Vector Art',
  'Manga',
  'Cinematic Oil Painting',
  'Hyper-Realistic Photo',
  'Cyberpunk Neon',
  'Noir Sketch',
  'Watercolor',
  '8-bit Pixel Art',
  'Claymation',
] as const;

export const ERA_STYLE_TAGS = [
  'Cyberpunk',
  'Afrofuturist',
  'Ancient Mythic',
  '1990s Nostalgic',
  'Modern Luxury',
  'Gothic',
  'Industrial',
] as const;

export const LOCATION_TYPE_TAGS = [
  'Urban Cityscape',
  'Interior Residential',
  'High-Tech Lab',
  'Natural Wilderness',
  'Galactic Station',
] as const;

export const ARCHITECTURAL_DETAIL_TAGS = [
  'Brutalist',
  'Art Deco',
  'Ornate/Baroque',
  'Minimalist',
  'Bio-organic',
] as const;

/** Set Dressing & Props (replaces Character Wardrobe for assets) */
export const SET_DRESSING_PRESETS = {
  furniture: [
    'Minimalist Sofa',
    'Vintage Armchair',
    'Industrial Desk',
    'Ornate Table',
    'Modular Shelving',
    'Low Profile Seating',
  ] as const,
  lightingFixtures: [
    'Neon Strip',
    'Chandelier',
    'Track Lighting',
    'Floor Lamp',
    'Sconces',
    'Skylight',
  ] as const,
  surfaceTextures: [
    'Grit',
    'Neon',
    'Foliage',
    'Concrete',
    'Marble',
    'Wood Grain',
    'Metallic',
  ] as const,
  specificProps: [
    'Tech Console',
    'Plants',
    'Artwork',
    'Weapons Rack',
    'Holodisplay',
  ] as const,
} as const;

export type SetDressingCategory = keyof typeof SET_DRESSING_PRESETS;

/** Cinematic: Angle + Tone only (per spec) */
export const CINEMATIC_OPTIONS = {
  angle: ['Low', 'High', 'Wide-angle', 'Macro'] as const,
  tone: ['Melancholic', 'Heroic', 'Suspenseful', 'Gritty'] as const,
} as const;

export type AssetCinematicKey = keyof typeof CINEMATIC_OPTIONS;

/** Spatial Expansion: Room */
export const SPATIAL_ROOM_OPTIONS = [
  'Interior from Exterior',
  'Adjacent Room',
] as const;

/** Spatial Expansion: Urban */
export const SPATIAL_URBAN_OPTIONS = [
  'Adjacent City Block',
  'Aerial View',
] as const;

/** Time/Season quick toggles */
export const TIME_SEASON_OPTIONS = [
  'Night',
  'Noon',
  'Golden Hour',
  'Winter (Snow)',
  'Autumn',
] as const;

export type TimeSeasonId = (typeof TIME_SEASON_OPTIONS)[number];
