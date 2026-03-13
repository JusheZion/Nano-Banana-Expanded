export type BalloonKind = 'speech' | 'thought' | 'shout' | 'narration';

/** Office-style text warp / WordArt transform profiles */
export type TextWarpId = 'none' | 'arcUp' | 'arcDown' | 'wave' | 'circle' | 'arch' | 'button' | 'square' | 'triangle' | 'cascade' | 'slant' | 'fade';

export type BalloonStyleId =
    | 'speech_round'
    | 'speech_rounded_rectangle'
    | 'thought_cloud'
    | 'shout_spiky'
    | 'narration_box'
    | 'whisper_dashed'
    | 'radio_electric'
    | 'sound_effect_action'
    | 'sound_effect_impact'
    | 'cloud_fluffy'
    | 'cloud_fluffy_no_tail'
    | 'starburst_action'
    | 'scream_jagged'
    | 'box_slanted'
    | 'double_burst'
    | 'floating_text';

export interface BalloonStyle {
    id: BalloonStyleId;
    label: string;
    kind: BalloonKind;

    fill: string;
    stroke: string;
    strokeWidth: number;
    fontFamily: string;
    fontSize: number;
    textColor: string;

    hasTail: boolean;
    tailStyle: 'straight' | 'curved' | 'spiky' | 'bubbles';

    cornerRadius?: number;
    spikiness?: number;

    textWarp?: TextWarpId;
    textStroke?: string;
    textStrokeWidth?: number;
    secondaryTextStroke?: string;
    secondaryTextStrokeWidth?: number;
    text3DExtrusion?: number;
    text3DExtrusionColor?: string;
    text3DExtrusionAngle?: number;
}

export interface Point {
    x: number;
    y: number;
}

import type { GradientSpec } from './gradient';

/** Optional transform for the text box relative to the balloon body (offset and scale). */
export interface TextBoxTransform {
    offsetX?: number;
    offsetY?: number;
    scaleX?: number;
    scaleY?: number;
}

export interface BalloonOverrides {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontFamily?: string;
    fontSize?: number;
    textColor?: string;
    tailFlip?: boolean;
    /** Phase 16: independent text box position/scale relative to balloon body */
    textBox?: TextBoxTransform;
    textStroke?: string;
    textStrokeWidth?: number;
    secondaryTextStroke?: string;
    secondaryTextStrokeWidth?: number;
    textWarp?: TextWarpId;
    textWarpIntensity?: number; // E.g., multiplier for bend/circle spread
    textLetterSpacing?: number; // Spacing between letters
    text3DExtrusion?: number;
    text3DExtrusionColor?: string;
    text3DExtrusionAngle?: number;
    /** Horizontal alignment of text within the balloon */
    textAlignHorizontal?: 'left' | 'center' | 'right';
    /** Vertical alignment of text within the balloon */
    textAlignVertical?: 'top' | 'middle' | 'bottom';
    /** Phase 15: gradient fill/stroke/text */
    fillGradient?: GradientSpec;
    strokeGradient?: GradientSpec;
    textColorGradient?: GradientSpec;
    /** Phase 16: Home ribbon typography */
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
}

export interface BalloonInstance {
    id: string;
    type: 'balloon';

    // Position and size of the main body
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;

    hasTail: boolean;
    tailBasePoint: Point;
    tailTip: Point;

    styleId: BalloonStyleId;
    overrides?: BalloonOverrides;
    fontFamily?: string;

    text: string;
    autoSize?: boolean;
    padding?: number;

    flipX?: boolean;
    flipY?: boolean;
    isSelected?: boolean;
    isLocked?: boolean;
    isVisible?: boolean;

    // FX
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowOpacity?: number;
    shadowColor?: string;
    glowColor?: string;
    glowBlur?: number;
    glowSpread?: number;
    glowOpacity?: number;

    // Texture
    textureId?: string;
    textureOpacity?: number;

    /** Phase 16: text box transform (offset/scale) relative to balloon body; when undefined, treated as 0,0,1,1 */
    textBox?: TextBoxTransform;
}
