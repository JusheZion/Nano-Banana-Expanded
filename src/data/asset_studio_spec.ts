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

/** Design era / cultural line — aligns with location reference workflows. */
export const ERA_STYLE_TAGS = [
  'Contemporary',
  'Mid-century modern',
  'Industrial heritage',
  'Art Deco revival',
  'Neo-futurist',
  'Rustic vernacular',
  'Colonial revival',
] as const;

/** Where the camera sits in the world — place type for setting refs. */
export const LOCATION_TYPE_TAGS = [
  'Interior domestic',
  'Interior commercial',
  'Exterior street',
  'Exterior landscape',
  'Rooftop / terrace',
  'Industrial district',
  'Coastal waterfront',
  'High-tech campus',
  'Suburban',
  'Rural',
  'Desert',
] as const;

/** Architectural vocabulary for shell and interior read. */
export const ARCHITECTURAL_DETAIL_TAGS = [
  'Brutalist',
  'Art Deco',
  'Neoclassical',
  'Minimalist',
  'High-tech',
  'Biophilic',
  'Ornate historic',
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
  'Gym',
  'Hallway',
  'Kitchen',
  'Living Room',
  'Nursery',
  'Office',
  'Patio',
  'Studio',
  'Sunroom',
  'Walk-in Closet',
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

/**
 * Single source for Asset cinematic angles and Spatial Expansion gallery camera chips.
 * Includes classic coverage (eye level, OTS, POV) plus existing framing vocabulary.
 */
export const STUDIO_CAMERA_ANGLE_OPTIONS = [
  'Eye level',
  'Low',
  'High',
  'Wide-angle',
  'Over-the-shoulder',
  'Macro',
  "Bird's Eye",
  'Dutch',
  'POV',
] as const;

export type StudioCameraAngleId = (typeof STUDIO_CAMERA_ANGLE_OPTIONS)[number];

/** Spatial Expansion Gallery right panel — same vocabulary as cinematic angles (parity). */
export const SPATIAL_GALLERY_CAMERA_ANGLE_OPTIONS = STUDIO_CAMERA_ANGLE_OPTIONS;

/** Cinematic: Angle + Tone only (per spec). Angle is unified with `STUDIO_CAMERA_ANGLE_OPTIONS`. */
export const CINEMATIC_OPTIONS = {
  angle: STUDIO_CAMERA_ANGLE_OPTIONS,
  tone: [
    'Melancholic',
    'Heroic',
    'Suspenseful',
    'Gritty',
    'Dreamy',
    'Documentary',
    'Noir',
  ] as const,
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
  'Blue Hour',
  'Dawn',
  'Dusk',
  'Fog',
  'Golden Hour',
  'Midday',
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
