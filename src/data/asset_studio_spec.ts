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

/** Room Type tags for Scene Setting & Props (alphabetized) */
export const ROOM_TYPE_TAGS = [
  'Attic',
  'Balcony',
  'Basement',
  'Bathroom',
  'Bedroom',
  'Dining Room',
  'Foyer',
  'Garage',
  'Hallway',
  'Kitchen',
  'Living Room',
  'Nursery',
  'Office',
  'Patio',
  'Studio',
] as const;

/** Set Dressing & Props (Scene Setting & Props section) */
export const SET_DRESSING_PRESETS = {
  roomType: ROOM_TYPE_TAGS,
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

/** Cinematic: Angle + Tone only (per spec). Angle includes Reference Gallery options (Bird's Eye, Dutch). */
export const CINEMATIC_OPTIONS = {
  angle: ['Low', 'High', 'Wide-angle', 'Macro', "Bird's Eye", 'Dutch'] as const,
  tone: ['Melancholic', 'Heroic', 'Suspenseful', 'Gritty'] as const,
} as const;

export type AssetCinematicKey = keyof typeof CINEMATIC_OPTIONS;

/** Spatial Expansion: Room (alphabetized) */
export const SPATIAL_ROOM_OPTIONS = [
  'Adjacent Room',
  'Continuation',
  'Corner View',
  'Cross-Section',
  'Interior from Exterior',
  'Same Space Different Angle',
] as const;

/** Spatial Expansion: Urban (alphabetized) */
export const SPATIAL_URBAN_OPTIONS = [
  'Aerial View',
  'Adjacent City Block',
  'Rooftop View',
  'Street Extension',
] as const;

/** Time/Season quick toggles (alphabetized) */
export const TIME_SEASON_OPTIONS = [
  'Autumn',
  'Dawn',
  'Dusk',
  'Golden Hour',
  'Night',
  'Noon',
  'Overcast',
  'Spring',
  'Summer',
  'Winter (Snow)',
] as const;

export type TimeSeasonId = (typeof TIME_SEASON_OPTIONS)[number];

/** Aspect Ratio for Spatial Expansion Gallery (parity with Reference Character Studio) */
export type AspectRatioId = '9:16' | '1:1' | '21:9';

/** Camera Angle options for Spatial Expansion Gallery right panel (same as Reference Character Studio Reference Gallery) */
export const SPATIAL_GALLERY_CAMERA_ANGLE_OPTIONS = [
  'Low',
  'High',
  "Bird's Eye",
  'Dutch',
] as const;
