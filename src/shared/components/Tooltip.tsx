import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
    ACCENT_GOLD_GRADIENT,
    CHARACTER_STUDIO_EMERALD_TEXT,
    ASSET_STUDIO_AMETHYST_TEXT,
} from '@/shared/theme/Phase12DesignTokens';

export type StudioTooltipVariant = 'character' | 'asset';

const STUDIO_TEXT: Record<StudioTooltipVariant, React.CSSProperties> = {
    character: {
        background: CHARACTER_STUDIO_EMERALD_TEXT,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
    },
    asset: {
        background: ASSET_STUDIO_AMETHYST_TEXT,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
    },
};

/** Opaque gold-gradient surface + studio text color for readability over busy backgrounds. */
function studioSurfaceStyle(): React.CSSProperties {
    return {
        background: ACCENT_GOLD_GRADIENT,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        border: '1px solid rgba(170, 119, 28, 0.85)',
    };
}

function studioBodyTextClass(variant: StudioTooltipVariant): string {
    return variant === 'character'
        ? 'text-[0.8125rem] font-semibold leading-snug text-emerald-950'
        : 'text-[0.8125rem] font-semibold leading-snug text-violet-950';
}

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    /** Studio-themed opaque tooltip (gold bar style). Omit for default dark tooltip. */
    variant?: StudioTooltipVariant;
}

export function Tooltip({
    content,
    children,
    side = 'bottom',
    align = 'center',
    variant,
}: TooltipProps) {
    const studio = variant != null;
    return (
        <TooltipPrimitive.Provider delayDuration={variant != null ? 200 : 300}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        align={align}
                        sideOffset={8}
                        className={
                            studio
                                ? 'z-[80] max-w-xs rounded-lg px-3 py-2.5 shadow-xl'
                                : 'z-50 overflow-hidden rounded-md bg-neutral-900 px-3 py-2 text-xs text-white shadow-xl border border-white/20'
                        }
                        style={studio ? studioSurfaceStyle() : undefined}
                    >
                        {studio ? (
                            <div className={studioBodyTextClass(variant)}>{content}</div>
                        ) : (
                            content
                        )}
                        <TooltipPrimitive.Arrow
                            className={studio ? 'fill-[#fcf6ba]' : 'fill-neutral-900'}
                            width={12}
                            height={6}
                        />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}

/** Hover (delay) shows tip; click ? pins until × or Escape. */
export function PinnedHelpTooltip({
    title,
    children,
    variant,
}: {
    title: string;
    children: React.ReactNode;
    variant: StudioTooltipVariant;
}) {
    const [pinned, setPinned] = React.useState(false);
    const [hover, setHover] = React.useState(false);
    const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const leaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!pinned) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPinned(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [pinned]);

    React.useEffect(() => {
        if (!pinned) return;
        const onDoc = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setPinned(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [pinned]);

    const startHover = () => {
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }
        hoverTimerRef.current = setTimeout(() => setHover(true), 220);
    };
    const endHover = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        if (pinned) return;
        leaveTimerRef.current = setTimeout(() => setHover(false), 280);
    };
    const cancelLeave = () => {
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }
        if (!pinned) setHover(true);
    };

    const showPanel = pinned || (hover && !pinned);

    const panelInner = (
        <>
            <div className="flex items-start justify-between gap-2">
                <span
                    className="text-sm font-black uppercase tracking-wide"
                    style={STUDIO_TEXT[variant]}
                >
                    {title}
                </span>
                {pinned && (
                    <button
                        type="button"
                        onClick={() => setPinned(false)}
                        className={
                            variant === 'character'
                                ? 'shrink-0 rounded p-0.5 text-emerald-900 hover:bg-black/10'
                                : 'shrink-0 rounded p-0.5 text-violet-900 hover:bg-black/10'
                        }
                        aria-label="Close help"
                    >
                        ×
                    </button>
                )}
            </div>
            <div className={`mt-1.5 leading-snug ${studioBodyTextClass(variant)} opacity-95`}>
                {children}
            </div>
        </>
    );

    return (
        <div
            ref={wrapRef}
            className="relative inline-flex items-center"
            onMouseEnter={startHover}
            onMouseLeave={endHover}
        >
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setPinned((p) => !p);
                }}
                className={
                    variant === 'character'
                        ? 'ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-600/50 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/20'
                        : 'ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-violet-500/50 text-[10px] font-bold text-violet-200 hover:bg-violet-500/20'
                }
                aria-expanded={pinned}
                aria-label={`Help: ${title}`}
            >
                ?
            </button>
            {showPanel && (
                <div
                    className="absolute left-0 top-full z-[100] mt-0.5 w-64 rounded-lg px-3 py-2.5 pointer-events-auto before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 before:content-['']"
                    style={studioSurfaceStyle()}
                    onMouseEnter={cancelLeave}
                    onMouseLeave={() => {
                        if (!pinned) endHover();
                    }}
                >
                    {panelInner}
                </div>
            )}
        </div>
    );
}
