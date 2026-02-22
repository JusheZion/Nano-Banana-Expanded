export type BalloonKind = 'speech' | 'thought' | 'shout' | 'narration';

export type BalloonStyleId =
    | 'speech_round'
    | 'speech_rounded_rectangle'
    | 'thought_cloud'
    | 'shout_spiky'
    | 'narration_box'
    | 'whisper_dashed'
    | 'radio_electric';

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
    tailStyle: 'straight' | 'curved' | 'spiky';

    cornerRadius?: number;
    spikiness?: number;
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
