import React, { useId, useState } from 'react';
import { useCodexStore } from '@/stores/codexStore';
import { useVaultStore } from '@/stores/vaultStore';
import { bindableFields, resolveField, formatFieldValue, numericFieldValue } from '../vault/vaultBinding';
import type { ObsidianLoreEntry } from '@/portals/writer/obsidianLoreImport';
import type { CodexBinding } from '../types/codexObjects';
import {
  alignPatches,
  distributePatches,
  sharedValue,
  type AlignMode,
  type DistributeMode,
} from '../utils/alignment';
import { FinishPicker } from './FinishPicker';
import { getSigilFinish, SIGIL_FINISHES } from '../data/sigilFinishes';
import { readCollapsedSections, writeCollapsedSection } from '../utils/codexSession';
import type {
  CodexChartObject,
  CodexFrameObject,
  CodexObject,
  CodexSigilObject,
  CodexTextObject,
} from '../types/codexObjects';

const FONTS = ['Cinzel', 'EB Garamond', 'Georgia', 'Helvetica', 'Courier New'];

/** Bevel light directions, named rather than left as a raw angle. */
const BEVEL_ANGLES: Array<[string, number]> = [
  ['↖', 305],
  ['↑', 270],
  ['↗', 235],
  ['↘', 125],
  ['↓', 90],
  ['↙', 55],
];

/**
 * Inspector for the current selection. Typography and effects live here — the
 * controls the codex plates depend on and that the comic text object never had.
 */
export function PropertiesPanel({ selected }: { selected: CodexObject[] }) {
  const updateObjects = useCodexStore((s) => s.updateObjects);
  const applyPatches = useCodexStore((s) => s.applyPatches);

  if (selected.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-xs text-white/45">Nothing selected</p>
        <p className="max-w-[15rem] text-[11px] leading-relaxed text-white/30">
          Click an object on the plate to edit it, or drag a box around several.
          Shift-click to add to the selection.
        </p>
      </div>
    );
  }

  const one = selected.length === 1 ? selected[0] : null;
  const ids = selected.map((o) => o.id);
  const patchAll = (patch: Partial<CodexObject>) => updateObjects(ids, patch);

  const allLocked = selected.every((o) => o.locked);
  const allHidden = selected.every((o) => !o.visible);
  /** Every object the same kind? Then its own controls can edit them together. */
  const sharedKind = selected.every((o) => o.kind === selected[0].kind) ? selected[0].kind : null;

  const runAlign = (mode: AlignMode) => applyPatches(alignPatches(selected, mode));
  const runDistribute = (mode: DistributeMode) => applyPatches(distributePatches(selected, mode));

  return (
    <div className="space-y-5 p-3 text-white/85">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-white">
            {one ? one.name ?? one.kind : `${selected.length} objects`}
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">
            {one ? one.kind : sharedKind ? `${sharedKind}s` : 'mixed types'}
            {allLocked && ' · locked'}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <ToggleButton
            label={allLocked ? 'Unlock' : 'Lock'}
            active={allLocked}
            onClick={() => patchAll({ locked: !allLocked })}
          >
            {allLocked ? '🔒' : '🔓'}
          </ToggleButton>
          <ToggleButton
            label={allHidden ? 'Show' : 'Hide'}
            active={allHidden}
            onClick={() => patchAll({ visible: allHidden })}
          >
            {allHidden ? '🙈' : '👁'}
          </ToggleButton>
        </div>
      </header>

      {allLocked && (
        <p className="rounded border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-100/80">
          Locked. Unlock to move or resize on the plate; the fields below still apply.
        </p>
      )}

      {selected.length > 1 && (
        <Section title="Align">
          <Row label="Edges">
            {(
              [
                ['left', 'Align left'],
                ['centerX', 'Align centres horizontally'],
                ['right', 'Align right'],
                ['top', 'Align top'],
                ['middleY', 'Align middles vertically'],
                ['bottom', 'Align bottom'],
              ] as Array<[AlignMode, string]>
            ).map(([mode, title]) => (
              <IconButton key={mode} label={title} onClick={() => runAlign(mode)}>
                {ALIGN_GLYPH[mode]}
              </IconButton>
            ))}
          </Row>
          <Row label="Distribute">
            <IconButton
              label="Distribute horizontally"
              disabled={selected.length < 3}
              onClick={() => runDistribute('horizontal')}
            >
              ↔
            </IconButton>
            <IconButton
              label="Distribute vertically"
              disabled={selected.length < 3}
              onClick={() => runDistribute('vertical')}
            >
              ↕
            </IconButton>
            {selected.length < 3 && (
              <span className="pl-1 text-[10px] text-white/30">needs 3+</span>
            )}
          </Row>
        </Section>
      )}

      <Section title="Transform">
        <Row label="Opacity">
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={sharedValue(selected, 'opacity') ?? 1}
            onChange={(v) => patchAll({ opacity: v })}
          />
        </Row>
        <Row label="X">
          <NumberInput
            value={sharedValue(selected, 'x')}
            onChange={(v) => patchAll({ x: v })}
          />
        </Row>
        <Row label="Y">
          <NumberInput
            value={sharedValue(selected, 'y')}
            onChange={(v) => patchAll({ y: v })}
          />
        </Row>
        <Row label="Width">
          <NumberInput
            value={sharedValue(selected, 'width')}
            min={8}
            onChange={(v) => patchAll({ width: Math.max(8, v) })}
          />
        </Row>
        <Row label="Height">
          <NumberInput
            value={sharedValue(selected, 'height')}
            min={8}
            onChange={(v) => patchAll({ height: Math.max(8, v) })}
          />
        </Row>
        <Row label="Rotation">
          <NumberInput
            value={sharedValue(selected, 'rotation')}
            suffix="°"
            onChange={(v) => patchAll({ rotation: v })}
          />
        </Row>
      </Section>

      {one?.kind === 'text' && (
        <>
          <TextSection object={one as CodexTextObject} />
          <CanonSection
            kindLabel="text"
            binding={(one as CodexTextObject).binding}
            onChange={(binding) => updateObjects([one.id], { binding } as Partial<CodexObject>)}
          />
        </>
      )}
      {one?.kind === 'sigil' && <SigilSection object={one as CodexSigilObject} />}
      {one?.kind === 'frame' && <FrameSection object={one as CodexFrameObject} />}
      {one?.kind === 'chart' && (
        <>
          <ChartSection object={one as CodexChartObject} />
          <ChartCanonSection object={one as CodexChartObject} />
        </>
      )}

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

/**
 * Ties an object to a field in a vault note.
 *
 * Only rendered when a vault is connected: offering a binding UI with nothing
 * to bind to would be a dead end. `live` re-resolves on every refresh; `once`
 * fills the value now and then lets go.
 */
function CanonSection({
  binding,
  onChange,
  /** Field list for the bound note, plus a live preview of the current value. */
  kindLabel,
}: {
  binding: CodexBinding | undefined;
  onChange: (next: CodexBinding | undefined) => void;
  kindLabel: string;
}) {
  const status = useVaultStore((s) => s.status);
  const entries = useVaultStore((s) => s.entries);

  if (status !== 'ready') return null;

  const entry = binding ? entries.find((e) => e.sourcePath === binding.notePath) : undefined;
  const fields = entry ? bindableFields(entry) : [];
  const preview = entry && binding ? formatFieldValue(resolveField(entry, binding.field)) : '';

  return (
    <Section title="Canon">
      {!binding && (
        <p className="px-1 text-[11px] leading-relaxed text-white/35">
          Pick a note in the Vault panel to bind this {kindLabel} to canon.
        </p>
      )}

      {binding && (
        <>
          <Row label="Note">
            <span className="block truncate text-[11px] text-white/70" title={binding.notePath}>
              {binding.notePath.split('/').pop()}
            </span>
          </Row>

          {!entry && (
            <p className="rounded border border-rose-400/30 bg-rose-400/10 px-2 py-1.5 text-[11px] text-rose-100/80">
              That note is no longer in the vault. The value on the plate is unchanged.
            </p>
          )}

          {entry && (
            <>
              <Row label="Field">
                <select
                  value={binding.field}
                  onChange={(e) => onChange({ ...binding, field: e.target.value })}
                  className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:border-white/35 focus:outline-none"
                >
                  {!fields.includes(binding.field) && (
                    <option value={binding.field}>{binding.field} (missing)</option>
                  )}
                  {fields.map((field) => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </Row>

              <Row label="Update">
                <select
                  value={binding.mode}
                  onChange={(e) => onChange({ ...binding, mode: e.target.value as CodexBinding['mode'] })}
                  className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:border-white/35 focus:outline-none"
                >
                  <option value="live">Live — follows canon</option>
                  <option value="once">Once — filled, then mine</option>
                </select>
              </Row>

              <Row label="Value">
                <span className="block truncate text-[11px] text-white/50" title={preview}>
                  {preview || <span className="text-white/25">empty in canon</span>}
                </span>
              </Row>
            </>
          )}

          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="mt-1 text-[10px] text-white/35 underline underline-offset-2 hover:text-white/70"
          >
            Unbind
          </button>
        </>
      )}
    </Section>
  );
}

/**
 * Chart binding is per axis: a stat block is many fields of one note, not one
 * field. The note is chosen once; each axis then names its own frontmatter key.
 */
function ChartCanonSection({ object }: { object: CodexChartObject }) {
  const update = useCodexStore((s) => s.updateObject);
  const status = useVaultStore((s) => s.status);
  const entries = useVaultStore((s) => s.entries);

  if (status !== 'ready') return null;

  const entry = object.binding ? entries.find((e) => e.sourcePath === object.binding!.notePath) : undefined;
  const fields = entry ? bindableFields(entry) : [];

  return (
    <Section title="Canon">
      {!object.binding && (
        <p className="px-1 text-[11px] leading-relaxed text-white/35">
          Pick a note in the Vault panel to read these values from canon.
        </p>
      )}

      {object.binding && (
        <>
          <Row label="Note">
            <span className="block truncate text-[11px] text-white/70" title={object.binding.notePath}>
              {object.binding.notePath.split('/').pop()}
            </span>
          </Row>

          {!entry ? (
            <p className="rounded border border-rose-400/30 bg-rose-400/10 px-2 py-1.5 text-[11px] text-rose-100/80">
              That note is no longer in the vault. The plotted values are unchanged.
            </p>
          ) : (
            object.axes.map((axis, i) => (
              <Row key={i} label={axis.label || `Axis ${i + 1}`}>
                <select
                  value={axis.field ?? ''}
                  onChange={(e) => {
                    const field = e.target.value || undefined;
                    update(object.id, {
                      axes: object.axes.map((a, j) => (j === i ? { ...a, field } : a)),
                    } as Partial<CodexObject>);
                  }}
                  className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs text-white focus:border-white/35 focus:outline-none"
                >
                  <option value="">— not bound —</option>
                  {fields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                      {(() => {
                        const n = numericPreview(entry, field);
                        return n === null ? ' (not a number)' : ` (${n})`;
                      })()}
                    </option>
                  ))}
                </select>
              </Row>
            ))
          )}

          <button
            type="button"
            onClick={() => update(object.id, { binding: undefined } as Partial<CodexObject>)}
            className="mt-1 text-[10px] text-white/35 underline underline-offset-2 hover:text-white/70"
          >
            Unbind
          </button>
        </>
      )}
    </Section>
  );
}

/** Shows what a field would plot as, so a non-numeric key is obvious up front. */
function numericPreview(entry: ObsidianLoreEntry, field: string): number | null {
  return numericFieldValue(resolveField(entry, field));
}

function SigilSection({ object }: { object: CodexSigilObject }) {
  const update = useCodexStore((s) => s.updateObject);
  const set = (patch: Partial<CodexSigilObject>) => update(object.id, patch);

  /** Which preset the mark currently matches, if any — else it reads as Custom. */
  const currentFinish =
    SIGIL_FINISHES.find(
      (f) =>
        f.patch.tint === object.tint &&
        !!f.patch.gradient === !!object.gradient &&
        !!f.patch.bevel === !!object.bevel,
    )?.id ?? '';

  const bevel = object.bevel;

  return (
    <Section title="Sigil">
      <div className="px-1 pb-3">
        <FinishPicker
          label="Finish"
          value={currentFinish}
          onChange={(id) => {
            const finish = getSigilFinish(id);
            if (finish) set(finish.patch);
          }}
        />
      </div>

      <Row label="Tint">
        <ColorInput value={object.tint} onChange={(v) => set({ tint: v })} />
      </Row>

      <Row label="Weight">
        <Slider
          min={0.25}
          max={2.5}
          step={0.05}
          value={object.strokeScale ?? 1}
          onChange={(v) => set({ strokeScale: v })}
        />
      </Row>

      <Row label="Gradient">
        <label className="flex items-center gap-2 text-[11px] text-white/60">
          <input
            type="checkbox"
            checked={!!object.gradient}
            onChange={(e) =>
              set({
                gradient: e.target.checked
                  ? {
                      type: 'linear',
                      angle: 115,
                      stops: [
                        { offset: 0, color: '#fbeeb8' },
                        { offset: 0.5, color: object.tint },
                        { offset: 1, color: '#7d5a17' },
                      ],
                    }
                  : undefined,
              })
            }
          />
          {object.gradient ? 'On' : 'Off'}
        </label>
      </Row>

      {object.gradient && (
        <>
          <Row label="Angle">
            <Slider
              min={0}
              max={360}
              step={5}
              value={object.gradient.angle ?? 115}
              onChange={(v) => set({ gradient: { ...object.gradient!, angle: v } })}
            />
          </Row>
          {object.gradient.stops.map((stop, i) => (
            <Row
              key={i}
              label={
                i === 0
                  ? 'Highlight'
                  : i === object.gradient!.stops.length - 1
                    ? 'Shadow'
                    // Numbered: a metal ramp has several mid stops, and three
                    // rows all labelled "Body" cannot be told apart.
                    : `Body ${i}`
              }
            >
              <ColorInput
                value={stop.color}
                onChange={(v) =>
                  set({
                    gradient: {
                      ...object.gradient!,
                      stops: object.gradient!.stops.map((s, j) =>
                        j === i ? { ...s, color: v } : s,
                      ),
                    },
                  })
                }
              />
            </Row>
          ))}
        </>
      )}

      <Row label="Relief">
        <label className="flex items-center gap-2 text-[11px] text-white/60">
          <input
            type="checkbox"
            checked={!!bevel}
            onChange={(e) =>
              set({
                bevel: e.target.checked
                  ? { depth: 0.4, angle: 125, light: '#fbeeb8', dark: '#4c3510' }
                  : undefined,
              })
            }
          />
          {bevel ? 'On' : 'Off'}
        </label>
      </Row>

      {bevel && (
        <>
          <Row label="Depth">
            <Slider
              min={0}
              max={2}
              step={0.05}
              value={bevel.depth}
              onChange={(v) => set({ bevel: { ...bevel, depth: v } })}
            />
          </Row>
          <Row label="Light from">
            <div className="flex gap-1">
              {BEVEL_ANGLES.map(([glyph, angle]) => (
                <button
                  key={angle}
                  type="button"
                  aria-label={`Light from ${glyph}`}
                  aria-pressed={bevel.angle === angle}
                  onClick={() => set({ bevel: { ...bevel, angle } })}
                  className={[
                    'h-6 w-6 rounded border text-[11px] leading-none transition-colors focus:outline-none focus:ring-1 focus:ring-white/50',
                    bevel.angle === angle
                      ? 'border-white/60 bg-white/15 text-white'
                      : 'border-white/15 text-white/45 hover:border-white/35',
                  ].join(' ')}
                >
                  {glyph}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Lit edge">
            <ColorInput value={bevel.light} onChange={(v) => set({ bevel: { ...bevel, light: v } })} />
          </Row>
          <Row label="Shadow edge">
            <ColorInput value={bevel.dark} onChange={(v) => set({ bevel: { ...bevel, dark: v } })} />
          </Row>
        </>
      )}
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

/**
 * Collapsible group. Which sections are folded is a workspace preference, so it
 * persists — a user who always collapses Effects should not refold it on every
 * reload.
 */
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const headingId = useId();
  const [open, setOpen] = useState(() => {
    const stored = readCollapsedSections()[title];
    return stored === undefined ? defaultOpen : !stored;
  });

  const toggle = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      writeCollapsedSection(title, !next);
      return next;
    });
  };

  return (
    <section className="space-y-2" aria-labelledby={headingId}>
      <button
        type="button"
        id={headingId}
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left text-[10px] uppercase tracking-[0.14em] text-white/40 transition-colors hover:text-white/70 focus:outline-none focus:ring-1 focus:ring-white/40"
      >
        <span aria-hidden="true" className={open ? '' : '-rotate-90'} style={{ transition: 'transform .12s' }}>
          ▾
        </span>
        {title}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </section>
  );
}

/**
 * One property row.
 *
 * A single control is given the row's label as its accessible name. Several
 * controls become a labelled group instead: wrapping a set of buttons in one
 * `<label>` is invalid and makes clicking the label fire the first button.
 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const labelId = useId();
  const count = React.Children.count(children);
  const single = count === 1 && React.isValidElement(children);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span id={labelId} className="w-20 shrink-0 text-white/45">
        {label}
      </span>
      <span className="min-w-0 flex-1">
        {single ? (
          React.cloneElement(children as React.ReactElement<{ 'aria-label'?: string }>, {
            'aria-label':
              (children as React.ReactElement<{ 'aria-label'?: string }>).props['aria-label'] ?? label,
          })
        ) : (
          <span role="group" aria-labelledby={labelId} className="flex min-w-0 flex-1 items-center gap-1">
            {children}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Numeric field.
 *
 * `undefined` means the selected objects disagree, and it renders as an empty
 * field placeheld "Mixed" rather than showing the first object's number — which
 * would misreport the rest, and would write that value to all of them on the
 * next keystroke.
 */
function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  'aria-label': ariaLabel,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  'aria-label'?: string;
}) {
  const mixed = value === undefined;
  return (
    <span className="relative flex items-center">
      <input
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={mixed ? '' : Math.round((value as number) * 100) / 100}
        placeholder={mixed ? 'Mixed' : undefined}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(next)) onChange(next);
        }}
        className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs tabular-nums text-white placeholder:text-white/30 focus:border-white/35 focus:outline-none"
      />
      {suffix && (
        <span aria-hidden="true" className="pointer-events-none absolute right-2 text-[10px] text-white/30">
          {suffix}
        </span>
      )}
    </span>
  );
}

const ALIGN_GLYPH: Record<AlignMode, string> = {
  left: '⇤',
  centerX: '↔',
  right: '⇥',
  top: '⤒',
  middleY: '↕',
  bottom: '⤓',
};

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="h-6 w-6 rounded border border-white/15 text-[11px] leading-none text-white/70 transition-colors hover:border-white/40 hover:text-white disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-white/50"
    >
      {children}
    </button>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={[
        'h-7 w-7 rounded border text-[12px] leading-none transition-colors focus:outline-none focus:ring-1 focus:ring-white/50',
        active ? 'border-amber-300/50 bg-amber-300/15' : 'border-white/15 hover:border-white/40',
      ].join(' ')}
    >
      {children}
    </button>
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
