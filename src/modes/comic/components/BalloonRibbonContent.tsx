import React from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { BALLOON_STYLES } from '../data/BalloonStyles';
import type { BalloonStyleId, BalloonStyle } from '../../../types/balloon';
import { Tooltip } from '@/shared/components/Tooltip';
import { Cloud, Square, Radio, MessageCircle, Circle, Sparkles, Zap, ArrowRightToLine, ArrowLeftRight } from 'lucide-react';
import {
  ACCENT_GOLD_GRADIENT,
  TEXT_ON_GOLD,
  TEXT_ON_BLUE,
} from '../theme/Phase12DesignTokens';
import { useShallow } from 'zustand/react/shallow';

/** Curated balloon styles for ribbon – one per shape type */
const RIBBON_BALLOON_STYLES: BalloonStyle[] = [
  'cloud_fluffy',
  'speech_rounded_rectangle',
  'radio_electric',
  'thought_cloud',
  'speech_round',
].map(id => BALLOON_STYLES.find(s => s.id === id)).filter((s): s is BalloonStyle => Boolean(s));

/** Word Art & SFX styles */
const SFX_ART_STYLES = BALLOON_STYLES.filter(s => s.id.startsWith('sound_effect'));

/** A few common SFX stamps */
const SFX_STAMPS = ['BOOM', 'ZAP', 'POW', 'CRASH'] as const;

const iconBtnBase = 'flex flex-col items-center justify-center gap-0 rounded-lg border border-white/20 transition-all shrink-0 min-w-[2.25rem] py-1 px-0.5';
const iconBtnStyle = (active?: boolean) =>
  active ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { background: 'rgba(252,246,186,0.15)', color: TEXT_ON_BLUE };

function balloonStyleIcon(styleId: string) {
  if (styleId.includes('cloud') || styleId.includes('thought')) return <Cloud size={18} />;
  if (styleId.includes('rounded_rectangle') || styleId.includes('narration') || styleId.includes('slanted')) return <Square size={18} />;
  if (styleId.includes('radio')) return <Radio size={18} />;
  if (styleId.includes('speech_round') || styleId.includes('whisper')) return <Circle size={18} />;
  return <MessageCircle size={18} />;
}

export interface BalloonRibbonContentProps {
  currentPageId: string | null;
  selectedBalloonId: string | null;
  onAddBalloon?: (styleId: BalloonStyleId) => void;
  onApplyStyleToSelected?: (styleId: BalloonStyleId) => void;
  onAddSfxStamp?: (text: string) => void;
}

function RibbonGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-90 px-0.5" style={{ color: TEXT_ON_BLUE }}>
        {title}
      </span>
      <div className="flex items-end gap-1">{children}</div>
    </div>
  );
}

function IconLabelButton({
  icon,
  label,
  tooltip,
  onClick,
}: { icon: React.ReactNode; label: string; tooltip: string; onClick: () => void }) {
  return (
    <Tooltip content={tooltip}>
      <button type="button" onClick={onClick} className={iconBtnBase} style={iconBtnStyle(false)}>
        <span className="flex items-center justify-center shrink-0">{icon}</span>
        <span className="text-[9px] font-medium leading-tight max-w-[3rem] truncate text-center" style={{ color: TEXT_ON_BLUE }}>{label}</span>
      </button>
    </Tooltip>
  );
}

export const BalloonRibbonContent: React.FC<BalloonRibbonContentProps> = (props) => {
  const {
    addBalloon,
    addOverlay,
    updateBalloon,
    snapBalloonTailToPanelEdge,
    pages,
  } = useComicStore(
    useShallow((s) => ({
      addBalloon: s.addBalloon,
      addOverlay: s.addOverlay,
      updateBalloon: s.updateBalloon,
      snapBalloonTailToPanelEdge: s.snapBalloonTailToPanelEdge,
      pages: s.pages,
    })),
  );
  const currentPage = pages.find(p => p.id === props.currentPageId);
  const selectedBalloon = props.selectedBalloonId ? currentPage?.balloons.find(b => b.id === props.selectedBalloonId) : null;
  const canSnapTail = Boolean(props.currentPageId && props.selectedBalloonId && selectedBalloon?.hasTail && selectedBalloon?.tailTip);

  const handleAddCallout = (styleId: string) => {
    const style = BALLOON_STYLES.find(s => s.id === styleId);
    if (!style || !currentPage) return;
    const sid = styleId as BalloonStyleId;
    const overrides: Record<string, unknown> = {};
    if (style.textWarp) overrides.textWarp = style.textWarp;
    if (style.textStroke) overrides.textStroke = style.textStroke;
    if (style.textStrokeWidth) overrides.textStrokeWidth = style.textStrokeWidth;
    if (style.secondaryTextStroke) overrides.secondaryTextStroke = style.secondaryTextStroke;
    if (style.secondaryTextStrokeWidth) overrides.secondaryTextStrokeWidth = style.secondaryTextStrokeWidth;
    if (style.text3DExtrusion) overrides.text3DExtrusion = style.text3DExtrusion;
    if (style.text3DExtrusionColor) overrides.text3DExtrusionColor = style.text3DExtrusionColor;
    // Stagger each new balloon so multiple adds don't stack exactly on top of each other.
    const stackIndex = currentPage.balloons.length % 8;
    addBalloon(currentPage.id, {
      x: 400 + stackIndex * 28, y: 600 + stackIndex * 28, width: 250, height: 150,
      hasTail: style.hasTail, tailBasePoint: { x: 0, y: 0 }, tailTip: { x: -50, y: 100 },
      styleId: sid,
      text: style.kind === 'shout' && styleId.includes('sound_effect') ? 'BOOM!' : 'Text...',
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    });
    props.onAddBalloon?.(sid);
  };

  const handleApplyToSelected = (styleId: string) => {
    if (!props.selectedBalloonId || !props.currentPageId) {
      handleAddCallout(styleId);
      return;
    }
    const style = BALLOON_STYLES.find(s => s.id === styleId);
    if (!style) return;
    const balloon = currentPage?.balloons.find(b => b.id === props.selectedBalloonId);
    const existingOverrides = (balloon?.overrides || {}) as Record<string, unknown>;
    // hasTail/tailStyle/cornerRadius are NOT read from overrides — hasTail is a top-level balloon
    // field, and tailStyle/cornerRadius come from the styleDef (via styleId). Strip any stale copies
    // from overrides and set hasTail at the top level so switching styles actually adds/removes the tail.
    const { hasTail: _staleTail, tailStyle: _staleTailStyle, cornerRadius: _staleCorner, ...overrides } = existingOverrides;
    void _staleTail; void _staleTailStyle; void _staleCorner;
    updateBalloon(props.currentPageId, props.selectedBalloonId, {
      styleId: styleId as BalloonStyleId,
      ...(style.hasTail != null && { hasTail: style.hasTail }),
      overrides,
    });
    props.onApplyStyleToSelected?.(styleId as BalloonStyleId);
  };

  const handleSfxStamp = (text: string) => {
    if (!props.currentPageId) return;
    addOverlay(props.currentPageId, { type: 'sfx', text, src: '', x: 350, y: 180, rotation: 0, scaleX: 1, scaleY: 1, zIndex: 0 });
    props.onAddSfxStamp?.(text);
  };

  if (!currentPage) return null;

  return (
    <div className="flex items-center gap-4 flex-wrap min-w-0">
      <RibbonGroup title="Speech & Thought">
        {RIBBON_BALLOON_STYLES.map((s) => (
          <IconLabelButton
            key={s.id}
            icon={balloonStyleIcon(s.id)}
            label={s.label.replace(/ \(.*\)$/, '')}
            tooltip={s.label}
            onClick={() => handleApplyToSelected(s.id)}
          />
        ))}
      </RibbonGroup>

      <div className="h-8 w-px bg-white/20 shrink-0 self-center" />

      <RibbonGroup title="SFX & Art">
        {SFX_ART_STYLES.map((s) => (
          <IconLabelButton
            key={s.id}
            icon={<Sparkles size={18} />}
            label={s.label.replace('SFX: ', '')}
            tooltip={s.label}
            onClick={() => handleAddCallout(s.id)}
          />
        ))}
      </RibbonGroup>

      <div className="h-8 w-px bg-white/20 shrink-0 self-center" />

      <RibbonGroup title="SFX stamp">
        {SFX_STAMPS.map((t) => (
          <IconLabelButton
            key={t}
            icon={<Zap size={18} />}
            label={t}
            tooltip={`Add "${t}" SFX`}
            onClick={() => handleSfxStamp(t)}
          />
        ))}
      </RibbonGroup>

      {canSnapTail && selectedBalloon && (
        <>
          <div className="h-8 w-px bg-white/20 shrink-0 self-center" />
          <RibbonGroup title="Tail">
            <Tooltip content="Flip tail – point speech tail the other direction">
              <button
                type="button"
                onClick={() => props.currentPageId && props.selectedBalloonId && updateBalloon(props.currentPageId, props.selectedBalloonId, { overrides: { ...(selectedBalloon.overrides || {}), tailFlip: !selectedBalloon.overrides?.tailFlip } })}
                className={iconBtnBase}
                style={iconBtnStyle(Boolean(selectedBalloon.overrides?.tailFlip))}
              >
                <span className="flex items-center justify-center shrink-0"><ArrowLeftRight size={18} /></span>
                <span className="text-[9px] font-medium leading-tight max-w-[3rem] truncate text-center" style={{ color: TEXT_ON_BLUE }}>Flip tail</span>
              </button>
            </Tooltip>
            <Tooltip content="Snap tail to nearest panel edge">
              <button
                type="button"
                onClick={() => props.currentPageId && props.selectedBalloonId && snapBalloonTailToPanelEdge(props.currentPageId, props.selectedBalloonId)}
                className={iconBtnBase}
                style={iconBtnStyle(false)}
              >
                <span className="flex items-center justify-center shrink-0"><ArrowRightToLine size={18} /></span>
                <span className="text-[9px] font-medium leading-tight max-w-[3rem] truncate text-center" style={{ color: TEXT_ON_BLUE }}>Snap to edge</span>
              </button>
            </Tooltip>
          </RibbonGroup>
        </>
      )}
    </div>
  );
};
