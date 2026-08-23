import { useCodexStore } from '@/stores/codexStore';
import type {
  CodexChartObject,
  CodexFrameObject,
  CodexObject,
  CodexSigilObject,
  CodexTextObject,
} from '../types/codexObjects';

const FONTS = ['Cinzel', 'EB Garamond', 'Georgia', 'Helvetica', 'Courier New'];

/**
 * Inspector for the current selection. Typography and effects live here — the
 * controls the codex plates depend on and that the comic text object never had.
 */
export function PropertiesPanel({ selected }: { selected: CodexObject[] }) {
  const updateObject = useCodexStore((s) => s.updateObject);
  const updateObjects = useCodexStore((s) => s.updateObjects);

  if (selected.length === 0) {
    return (
      <p className="p-4 text-xs text-white/40">
        Select something on the plate to edit it.
      </p>
    );
  }

  const one = selected.length === 1 ? selected[0] : null;
  const ids = selected.map((o) => o.id);
  const patchAll = (patch: Partial<CodexObject>) => updateObjects(ids, patch);

  return (
    <div className="space-y-5 p-3 text-white/85">
      <Section title={one ? one.name ?? one.kind : `${selected.length} selected`}>
        <Row label="Opacity">
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={one?.opacity ?? 1}
            onChange={(v) => patchAll({ opacity: v })}
          />
        </Row>
        {one && (
          <>
            <Row label="X">
              <NumberInput value={Math.round(one.x)} onChange={(v) => updateObject(one.id, { x: v })} />
            </Row>
            <Row label="Y">
              <NumberInput value={Math.round(one.y)} onChange={(v) => updateObject(one.id, { y: v })} />
            </Row>
            <Row label="Width">
              <NumberInput value={Math.round(one.width)} onChange={(v) => updateObject(one.id, { width: Math.max(8, v) })} />
            </Row>
            <Row label="Height">
              <NumberInput value={Math.round(one.height)} onChange={(v) => updateObject(one.id, { height: Math.max(8, v) })} />
            </Row>
            <Row label="Rotation">
              <NumberInput value={Math.round(one.rotation)} onChange={(v) => updateObject(one.id, { rotation: v })} />
            </Row>
          </>
        )}
      </Section>

      {one?.kind === 'text' && <TextSection object={one as CodexTextObject} />}
      {one?.kind === 'sigil' && <SigilSection object={one as CodexSigilObject} />}
      {one?.kind === 'frame' && <FrameSection object={one as CodexFrameObject} />}
      {one?.kind === 'chart' && <ChartSection object={one as CodexChartObject} />}

      <EffectsSection selected={selected} />
    </div>
  );
}

function TextSection({ object }: { object: CodexTextObject }) {
  const update = useCodexStore((s) => s.updateObject);
  const set = (patch: Partial<CodexTextObject>) => update(object.id, patch);

  return (
    <Section title="Typography">
      <label className="block">
        <span className="sr-only">Text content</span>
        <textarea
          value={object.text}
          onChange={(e) => set({ text: e.target.value })}
          rows={3}
          className="w-full rounded border border-white/15 bg-black/30 p-2 text-sm text-white focus:border-white/35 focus:outline-none"
        />
      </label>
      <Row label="Font">
        <select
          value={object.fontFamily}
          onChange={(e) => set({ fontFamily: e.target.value })}
          className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:outline-none"
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Row>
      <Row label="Size">
        <NumberInput value={object.fontSize} onChange={(v) => set({ fontSize: Math.max(6, v) })} />
      </Row>
      <Row label="Style">
        <select
          value={object.fontStyle}
          onChange={(e) => set({ fontStyle: e.target.value as CodexTextObject['fontStyle'] })}
          className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
          <option value="italic">Italic</option>
          <option value="italic bold">Bold italic</option>
        </select>
      </Row>
      <Row label="Tracking">
        <Slider min={-2} max={12} step={0.5} value={object.letterSpacing} onChange={(v) => set({ letterSpacing: v })} />
      </Row>
      <Row label="Leading">
        <Slider min={0.9} max={2.4} step={0.05} value={object.lineHeight} onChange={(v) => set({ lineHeight: v })} />
      </Row>
      <Row label="Align">
        <select
          value={object.align}
          onChange={(e) => set({ align: e.target.value as CodexTextObject['align'] })}
          className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Row>
      <Row label="Case">
        <select
          value={object.textTransform ?? 'none'}
          onChange={(e) => set({ textTransform: e.target.value as 'none' | 'uppercase' })}
          className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="none">As typed</option>
          <option value="uppercase">Uppercase</option>
        </select>
      </Row>
      <Row label="Colour">
        <ColorInput value={object.fill} onChange={(v) => set({ fill: v })} />
      </Row>
    </Section>
  );
}

function SigilSection({ object }: { object: CodexSigilObject }) {
  const update = useCodexStore((s) => s.updateObject);
  return (
    <Section title="Sigil">
      <Row label="Tint">
        <ColorInput value={object.tint} onChange={(v) => update(object.id, { tint: v })} />
      </Row>
    </Section>
  );
}

function FrameSection({ object }: { object: CodexFrameObject }) {
  const update = useCodexStore((s) => s.updateObject);
  const set = (patch: Partial<CodexFrameObject>) => update(object.id, patch);
  return (
    <Section title="Frame">
      <Row label="Variant">
        <select
          value={object.variant}
          onChange={(e) => set({ variant: e.target.value as CodexFrameObject['variant'] })}
          className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="plain">Plain rule</option>
          <option value="double">Double rule</option>
          <option value="bracketed">Bracket ticks</option>
          <option value="dashed">Dashed</option>
          <option value="litEdge">Lit edge</option>
        </select>
      </Row>
      <Row label="Stroke"><ColorInput value={object.stroke} onChange={(v) => set({ stroke: v })} /></Row>
      <Row label="Weight">
        <Slider min={0.5} max={6} step={0.5} value={object.strokeWidth} onChange={(v) => set({ strokeWidth: v })} />
      </Row>
      <Row label="Radius">
        <Slider min={0} max={32} step={1} value={object.cornerRadius} onChange={(v) => set({ cornerRadius: v })} />
      </Row>
    </Section>
  );
}

function ChartSection({ object }: { object: CodexChartObject }) {
  const update = useCodexStore((s) => s.updateObject);
  const set = (patch: Partial<CodexChartObject>) => update(object.id, patch);

  const setAxis = (index: number, patch: Partial<{ label: string; value: number }>) => {
    const axes = object.axes.map((a, i) => (i === index ? { ...a, ...patch } : a));
    set({ axes });
  };

  return (
    <Section title="Chart">
      <Row label="Kind">
        <select
          value={object.chartKind}
          onChange={(e) => set({ chartKind: e.target.value as CodexChartObject['chartKind'] })}
          className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="radial">Radar</option>
          <option value="bars">Bar meters</option>
          <option value="pips">Segmented pips</option>
          <option value="dial">Radial dial</option>
        </select>
      </Row>
      <Row label="Max"><NumberInput value={object.max} onChange={(v) => set({ max: Math.max(1, v) })} /></Row>
      <Row label="Plot"><ColorInput value={object.stroke} onChange={(v) => set({ stroke: v })} /></Row>
      <Row label="Track"><ColorInput value={object.track} onChange={(v) => set({ track: v })} /></Row>

      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Axes</div>
        {object.axes.map((axis, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={axis.label}
              onChange={(e) => setAxis(i, { label: e.target.value })}
              aria-label={`Axis ${i + 1} label`}
              className="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:outline-none"
            />
            <input
              type="number"
              value={axis.value}
              onChange={(e) => setAxis(i, { value: Number(e.target.value) })}
              aria-label={`Axis ${i + 1} value`}
              className="w-16 rounded border border-white/15 bg-black/30 px-2 py-1 text-xs tabular-nums text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => set({ axes: object.axes.filter((_, j) => j !== i) })}
              aria-label={`Remove axis ${i + 1}`}
              className="rounded border border-white/10 px-1.5 text-xs text-white/40 hover:text-white/80"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set({ axes: [...object.axes, { label: 'NEW AXIS', value: 50 }] })}
          className="w-full rounded border border-white/15 py-1 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
        >
          Add axis
        </button>
      </div>
    </Section>
  );
}

function EffectsSection({ selected }: { selected: CodexObject[] }) {
  const updateObjects = useCodexStore((s) => s.updateObjects);
  const ids = selected.map((o) => o.id);
  const one = selected[0];
  const patch = (p: Partial<CodexObject>) => updateObjects(ids, p);

  const shadow = one.shadow ?? { color: '#000000', blur: 12, offsetX: 4, offsetY: 4, opacity: 0.5 };
  const glow = one.glow ?? { color: '#d8b45a', blur: 16, opacity: 0.85 };

  return (
    <Section title="Effects">
      <Toggle
        label="Drop shadow"
        checked={Boolean(one.shadow)}
        onChange={(on) => patch({ shadow: on ? shadow : undefined })}
      />
      {one.shadow && (
        <>
          <Row label="Colour"><ColorInput value={one.shadow.color} onChange={(v) => patch({ shadow: { ...one.shadow!, color: v } })} /></Row>
          <Row label="Blur"><Slider min={0} max={60} step={1} value={one.shadow.blur} onChange={(v) => patch({ shadow: { ...one.shadow!, blur: v } })} /></Row>
          <Row label="Offset X"><Slider min={-40} max={40} step={1} value={one.shadow.offsetX} onChange={(v) => patch({ shadow: { ...one.shadow!, offsetX: v } })} /></Row>
          <Row label="Offset Y"><Slider min={-40} max={40} step={1} value={one.shadow.offsetY} onChange={(v) => patch({ shadow: { ...one.shadow!, offsetY: v } })} /></Row>
          <Row label="Strength"><Slider min={0} max={1} step={0.05} value={one.shadow.opacity} onChange={(v) => patch({ shadow: { ...one.shadow!, opacity: v } })} /></Row>
        </>
      )}

      <Toggle
        label="Glow"
        checked={Boolean(one.glow)}
        onChange={(on) => patch({ glow: on ? glow : undefined })}
      />
      {one.glow && (
        <>
          <Row label="Colour"><ColorInput value={one.glow.color} onChange={(v) => patch({ glow: { ...one.glow!, color: v } })} /></Row>
          <Row label="Blur"><Slider min={0} max={80} step={1} value={one.glow.blur} onChange={(v) => patch({ glow: { ...one.glow!, blur: v } })} /></Row>
          <Row label="Strength"><Slider min={0} max={1} step={0.05} value={one.glow.opacity} onChange={(v) => patch({ glow: { ...one.glow!, opacity: v } })} /></Row>
        </>
      )}
      {one.glow && one.shadow && (
        <p className="text-[10px] leading-snug text-amber-300/70">
          Glow and shadow share one canvas slot — glow is what renders while both are on.
        </p>
      )}

      <Row label="Blur">
        <Slider min={0} max={30} step={1} value={one.blur ?? 0} onChange={(v) => patch({ blur: v || undefined })} />
      </Row>
      {Boolean(one.blur) && (
        <p className="text-[10px] leading-snug text-white/40">
          Blur caches the object to a bitmap, so it re-renders on every change.
        </p>
      )}
    </Section>
  );
}

/* ---------- primitives ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] uppercase tracking-[0.14em] text-white/40">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-white/45">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs tabular-nums text-white focus:border-white/35 focus:outline-none"
    />
  );
}

function Slider({
  min, max, step, value, onChange,
}: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <span className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 min-w-0 flex-1 accent-amber-300"
      />
      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-white/45">
        {Math.round(value * 100) / 100}
      </span>
    </span>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#d8b45a'}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 w-full cursor-pointer rounded border border-white/15 bg-transparent p-0"
    />
  );
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-white/70">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-amber-300"
      />
      {label}
    </label>
  );
}
