import type { BalloonStyle } from '../../../types/balloon';
import {
    CLOUD_BODY,
    DOUBLE_BURST_BODY,
    ELECTRIC_RIM_BODY,
    ELLIPSE_BODY,
    ROUNDED_RECT_BODY,
    SLANTED_BOX_BODY,
    starburstBody,
} from './balloonGeometry';
import { resolveBalloonStyleId } from './balloonStyleMigration';

/** Used when a balloon references a style that no longer exists. */
export const FALLBACK_BALLOON_STYLE_ID = 'speech_round';

export const BALLOON_STYLES: BalloonStyle[] = [
    {
        id: 'starburst_action',
        body: starburstBody({ spikes: 14 }),
        tailAttachment: 'separate',
        label: 'Action Starburst',
        kind: 'shout',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        fontFamily: 'Bangers',
        fontSize: 24,
        textColor: '#000000',
        hasTail: false,
        tailStyle: 'straight'
    },
    {
        id: 'double_burst',
        body: DOUBLE_BURST_BODY,
        tailAttachment: 'separate',
        label: 'Double Burst',
        kind: 'shout',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        fontFamily: 'Bangers',
        fontSize: 24,
        textColor: '#000000',
        hasTail: false,
        tailStyle: 'straight'
    },
    {
        id: 'cloud_fluffy',
        body: CLOUD_BODY,
        tailAttachment: 'separate',
        label: 'Fluffy Cloud',
        kind: 'thought',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 4,
        fontFamily: '"Comic Sans MS", "Comic Neue", cursive',
        fontSize: 18,
        textColor: '#000000',
        hasTail: true,
        tailStyle: 'bubbles'
    },
    {
        id: 'cloud_fluffy_no_tail',
        body: CLOUD_BODY,
        tailAttachment: 'separate',
        label: 'Fluffy Cloud (No Tail)',
        kind: 'thought',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 4,
        fontFamily: '"Comic Sans MS", "Comic Neue", cursive',
        fontSize: 18,
        textColor: '#000000',
        hasTail: false,
        tailStyle: 'bubbles'
    },
    {
        id: 'scream_jagged',
        body: starburstBody({ spikes: 24, jagged: true }),
        tailAttachment: 'separate',
        label: 'Jagged Scream',
        kind: 'shout',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        fontFamily: '"Courier New", "Courier Prime", monospace',
        fontSize: 20,
        textColor: '#000000',
        hasTail: false,
        tailStyle: 'spiky'
    },
    {
        id: 'speech_rounded_rectangle',
        body: ROUNDED_RECT_BODY,
        tailAttachment: 'merged-rounded-rect',
        label: 'Modern Square',
        kind: 'speech',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        fontFamily: '"Comic Sans MS", "Comic Neue", cursive',
        fontSize: 20,
        textColor: '#000000',
        hasTail: true,
        tailStyle: 'straight',
        cornerRadius: 15
    },
    {
        id: 'narration_box',
        body: ROUNDED_RECT_BODY,
        tailAttachment: 'merged-rounded-rect',
        label: 'Narration Box',
        kind: 'narration',
        fill: '#ffffcc',
        stroke: '#000000',
        strokeWidth: 2,
        fontFamily: 'Georgia, "Playfair Display", serif',
        fontSize: 18,
        textColor: '#000000',
        hasTail: false,
        tailStyle: 'straight'
    },
    {
        id: 'radio_electric',
        body: ELECTRIC_RIM_BODY,
        tailAttachment: 'separate',
        label: 'Radio/Phone',
        kind: 'speech',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        fontFamily: '"Courier New", "Courier Prime", monospace',
        fontSize: 18,
        textColor: '#000000',
        hasTail: true,
        tailStyle: 'spiky'
    },
    {
        id: 'speech_round',
        body: ELLIPSE_BODY,
        tailAttachment: 'merged-ellipse',
        label: 'Round Speech',
        kind: 'speech',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        fontFamily: '"Comic Sans MS", "Comic Neue", cursive',
        fontSize: 20,
        textColor: '#000000',
        hasTail: true,
        tailStyle: 'straight',
        cornerRadius: 999
    },
    {
        id: 'shout_spiky',
        body: starburstBody({ spikes: 16 }),
        tailAttachment: 'separate',
        label: 'Shout',
        kind: 'shout',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 5,
        fontFamily: 'Impact, Anton, "Arial Narrow", sans-serif',
        fontSize: 24,
        textColor: '#000000',
        hasTail: true,
        tailStyle: 'spiky',
        spikiness: 0.5
    },
    {
        id: 'box_slanted',
        body: SLANTED_BOX_BODY,
        tailAttachment: 'separate',
        label: 'Slanted Box',
        kind: 'narration',
        fill: '#eeeeee',
        stroke: '#000000',
        strokeWidth: 2,
        fontFamily: 'Roboto',
        fontSize: 16,
        textColor: '#000000',
        hasTail: false,
        tailStyle: 'straight'
    },
    {
        id: 'whisper_dashed',
        body: ELLIPSE_BODY,
        tailAttachment: 'merged-ellipse',
        bodyDash: [5, 5],
        label: 'Whisper',
        kind: 'speech',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1.5,
        fontFamily: '"Comic Sans MS", "Comic Neue", cursive',
        fontSize: 18,
        textColor: '#999999',
        hasTail: true,
        tailStyle: 'straight',
        cornerRadius: 999,
    },
    {
        id: 'sound_effect_action',
        body: ELLIPSE_BODY,
        tailAttachment: 'merged-ellipse',
        label: 'SFX: Action',
        kind: 'shout',
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        fontFamily: 'Impact, Anton, "Arial Narrow", sans-serif',
        fontSize: 48,
        textColor: '#ffcc00',
        hasTail: false,
        tailStyle: 'straight',
        textWarp: 'wave',
        textStroke: '#000000',
        textStrokeWidth: 4,
        text3DExtrusion: 8,
        text3DExtrusionColor: '#000000'
    },
    {
        id: 'sound_effect_impact',
        body: ELLIPSE_BODY,
        tailAttachment: 'merged-ellipse',
        label: 'SFX: Impact',
        kind: 'shout',
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        fontFamily: 'Impact, Anton, "Arial Narrow", sans-serif',
        fontSize: 64,
        textColor: '#ff3300',
        hasTail: false,
        tailStyle: 'straight',
        textWarp: 'arch',
        textStroke: '#ffffff',
        textStrokeWidth: 3,
        secondaryTextStroke: '#000000',
        secondaryTextStrokeWidth: 5,
        text3DExtrusion: 12,
        text3DExtrusionColor: '#cc0000'
    },
    {
        id: 'floating_text',
        body: ELLIPSE_BODY,
        tailAttachment: 'merged-ellipse',
        label: 'Text Box',
        kind: 'narration',
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        fontFamily: '"Comic Sans MS", "Comic Neue", cursive',
        fontSize: 20,
        textColor: '#000000',
        hasTail: false,
        tailStyle: 'straight'
    }
];

/**
 * Resolves a balloon's `styleId` to a style that can actually be rendered.
 *
 * Call sites used to do `BALLOON_STYLES.find(...)` and bail on undefined — in ComicCanvas that
 * meant `return null`, so a balloon carrying an unknown style id silently vanished from the page
 * with no error. Since `styleId` is baked into every saved comic, that turned any typo or retired
 * id into apparently-lost artwork.
 *
 * Retired ids are re-mapped first (see balloonStyleMigration), and anything still unrecognised
 * falls back to a plain round speech balloon so the text stays visible and editable.
 */
export function resolveBalloonStyle(styleId: string): BalloonStyle {
    const resolvedId = resolveBalloonStyleId(styleId);
    const style = BALLOON_STYLES.find((s) => s.id === resolvedId);
    if (style) return style;

    if (import.meta.env.DEV) {
        console.warn(
            `[comic] Unknown balloon styleId "${styleId}"; falling back to "${FALLBACK_BALLOON_STYLE_ID}". ` +
                'If this id was retired, add it to RETIRED_BALLOON_STYLE_IDS.',
        );
    }
    const fallback = BALLOON_STYLES.find((s) => s.id === FALLBACK_BALLOON_STYLE_ID);
    if (!fallback) throw new Error('BALLOON_STYLES is missing its fallback style');
    return fallback;
}
