export type BalloonKind = 'speech' | 'thought' | 'shout' | 'narration';

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
    | 'double_burst';

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

    textWarp?: 'none' | 'arcUp' | 'arcDown' | 'wave' | 'circle' | 'arch';
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

export interface BalloonOverrides {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontFamily?: string;
    fontSize?: number;
    textColor?: string;
    tailFlip?: boolean;
    textStroke?: string;
    textStrokeWidth?: number;
    secondaryTextStroke?: string;
    secondaryTextStrokeWidth?: number;
    textWarp?: 'none' | 'arcUp' | 'arcDown' | 'wave' | 'circle' | 'arch';
    textWarpIntensity?: number; // E.g., multiplier for bend/circle spread
    textLetterSpacing?: number; // Spacing between letters
    text3DExtrusion?: number;
    text3DExtrusionColor?: string;
    text3DExtrusionAngle?: number;
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
}
