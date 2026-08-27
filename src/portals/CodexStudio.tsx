import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import {
  FileDown, FilePlus2, ImageDown, Layers, Plus, Redo2, Save,
  Sparkles, Trash2, Type, Undo2,
} from 'lucide-react';
import { useCodexStore, makeSigilObject, makeTextObject } from '@/stores/codexStore';
import { SigilPalette } from '@/modes/codex/components/SigilPalette';
import { FragmentPalette } from '@/modes/codex/components/FragmentPalette';
import { PropertiesPanel } from '@/modes/codex/components/PropertiesPanel';
import { CodexCanvas } from '@/modes/codex/engine/CodexCanvas';
import { PLATE_TEMPLATES } from '@/modes/codex/data/plateTemplates';
import {
  CODEX_INK, type CodexObject, type CodexPlate,
} from '@/modes/codex/types/codexObjects';
import {
  listDocuments, saveDocument, loadDocument, deleteDocument,
  type CodexDocumentSummary,
} from '@/modes/codex/utils/codexPersistence';
import {
  buildPdf, exportStagePng, rasterisePlate, safeFilename,
} from '@/modes/codex/utils/codexExport';

type DockTab = 'sigils' | 'properties' | 'layers' | 'documents';

/** Cascade geometry for successive insertions. */
const CASCADE_STEP = 28;
const CASCADE_WRAP = 8;

export function CodexStudio() {
  const doc = useCodexStore((s) => s.doc);
  const activePlateId = useCodexStore((s) => s.activePlateId);
  const selectedIds = useCodexStore((s) => s.selectedIds);
  const setActivePlate = useCodexStore((s) => s.setActivePlate);
  const addObject = useCodexStore((s) => s.addObject);
  const addObjects = useCodexStore((s) => s.addObjects);
  const addPlate = useCodexStore((s) => s.addPlate);
  const removePlate = useCodexStore((s) => s.removePlate);
  const updatePlate = useCodexStore((s) => s.updatePlate);
  const removeObjects = useCodexStore((s) => s.removeObjects);
  const duplicateObjects = useCodexStore((s) => s.duplicateObjects);
  const undo = useCodexStore((s) => s.undo);
  const redo = useCodexStore((s) => s.redo);
  const loadDoc = useCodexStore((s) => s.loadDocument);
  const newDoc = useCodexStore((s) => s.newDocument);
  const renameDoc = useCodexStore((s) => s.renameDocument);
  const select = useCodexStore((s) => s.select);

  const [tab, setTab] = useState<DockTab>('sigils');
  /** Which half of the library the Insert tab is showing. */
  const [insertMode, setInsertMode] = useState<'marks' | 'fragments'>('marks');
  const [zoom, setZoom] = useState(0.55);
  const [saved, setSaved] = useState<CodexDocumentSummary[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  useEffect(() => { setSaved(listDocuments()); }, []);

  const plate: CodexPlate | undefined = useMemo(
    () => doc.plates.find((p) => p.id === activePlateId) ?? doc.plates[0],
    [doc.plates, activePlateId],
  );

  const selected: CodexObject[] = useMemo(
    () => (plate ? plate.objects.filter((o) => selectedIds.includes(o.id)) : []),
    [plate, selectedIds],
  );

  const flash = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 2600);
  }, []);

  // Keyboard: delete, duplicate, undo/redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (mod && e.key.toLowerCase() === 'd' && selectedIds.length) {
        e.preventDefault();
        duplicateObjects(selectedIds);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) {
        e.preventDefault();
        removeObjects(selectedIds);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, duplicateObjects, removeObjects, selectedIds]);

  /**
   * Successive placements step down and right instead of landing on the same
   * pixel, so inserting several things in a row does not bury them in a stack.
   * Wraps after a few steps rather than marching off the plate.
   */
  const placeSeq = useRef(0);
  const cascade = useCallback(() => {
    const step = placeSeq.current % CASCADE_WRAP;
    placeSeq.current += 1;
    return step * CASCADE_STEP;
  }, []);

  const placeCentre = useCallback(
    (size: number) => {
      const offset = cascade();
      return {
        x: (plate?.width ?? 1040) / 2 - size / 2 + offset,
        y: (plate?.height ?? 1400) / 3 + offset,
      };
    },
    [plate, cascade],
  );

  /**
   * Fragments carry their own footprint, so centre the whole group rather than
   * a square. Grounds are plate-sized and land at the origin.
   */
  const placeFragment = useCallback(
    (w: number, h: number) => {
      const pw = plate?.width ?? 1040;
      const ph = plate?.height ?? 1400;
      if (w >= pw && h >= ph) return { x: 0, y: 0 };
      const offset = cascade();
      return {
        x: Math.max(0, Math.min(pw - w, Math.round(pw / 2 - w / 2) + offset)),
        y: Math.max(0, Math.min(ph - h, Math.round(ph / 2 - h / 2) + offset)),
      };
    },
    [plate, cascade],
  );

  const handleSave = () => {
    setSaved(saveDocument(doc));
    flash(`Saved “${doc.title}”.`);
  };

  const handleExportPng = () => {
    if (!stageRef.current || !plate) return;
    exportStagePng(stageRef.current, safeFilename(`${doc.title}-${plate.name}`, 'png'));
    flash('PNG exported.');
  };

  const handleExportPdf = async () => {
    if (!stageRef.current) return;
    const original = activePlateId;
    const rasters = [];
    for (const p of doc.plates) {
      setActivePlate(p.id);
      // Let React commit the plate switch before capturing the stage.
      await new Promise((r) => window.setTimeout(r, 120));
      if (stageRef.current) rasters.push(rasterisePlate(stageRef.current, p));
    }
    setActivePlate(original);
    buildPdf(rasters, safeFilename(doc.title, 'pdf'));
    flash(`PDF exported — ${rasters.length} page${rasters.length === 1 ? '' : 's'}.`);
  };

  if (!plate) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#0b0913] text-white">
      {/* toolbar */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <input
          value={doc.title}
          onChange={(e) => renameDoc(e.target.value)}
          aria-label="Codex title"
          className="min-w-[10rem] rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-white hover:border-white/15 focus:border-white/30 focus:outline-none"
        />
        <div className="mx-1 h-5 w-px bg-white/10" />

        <ToolButton icon={Undo2} label="Undo" onClick={undo} />
        <ToolButton icon={Redo2} label="Redo" onClick={redo} />
        <div className="mx-1 h-5 w-px bg-white/10" />

        <ToolButton
          icon={Type}
          label="Add text"
          onClick={() => addObject(makeTextObject({ ...placeCentre(360), width: 360 }))}
        />
        <ToolButton
          icon={Plus}
          label="Add chart"
          onClick={() => addObject(makeChart(placeCentre(420)))}
        />
        <ToolButton
          icon={Trash2}
          label="Delete selection"
          onClick={() => removeObjects(selectedIds)}
          disabled={selectedIds.length === 0}
        />
        <div className="mx-1 h-5 w-px bg-white/10" />

        <ToolButton icon={Save} label="Save" onClick={handleSave} />
        <ToolButton icon={ImageDown} label="Export PNG" onClick={handleExportPng} />
        <ToolButton icon={FileDown} label="Export PDF" onClick={() => void handleExportPdf()} />

        <div className="ml-auto flex items-center gap-2">
          {status && <span className="text-[11px] text-amber-300/80">{status}</span>}
          <label className="flex items-center gap-1.5 text-[11px] text-white/45">
            Zoom
            <input
              type="range" min={0.2} max={1.2} step={0.05} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 w-24 accent-amber-300"
            />
            <span className="w-8 tabular-nums text-right">{Math.round(zoom * 100)}%</span>
          </label>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* dock */}
        <aside className="flex w-[310px] shrink-0 flex-col border-r border-white/10 bg-black/25">
          <nav className="flex shrink-0 border-b border-white/10" role="tablist">
            {([
              ['sigils', 'Insert', Sparkles],
              ['properties', 'Properties', Type],
              ['layers', 'Layers', Layers],
              ['documents', 'Files', FilePlus2],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-white/40',
                  tab === id
                    ? 'border-b-2 border-amber-300/70 text-white'
                    : 'border-b-2 border-transparent text-white/45 hover:text-white/80',
                ].join(' ')}
              >
                <Icon size={13} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === 'sigils' && (
              <div className="flex h-full flex-col">
                <div className="flex shrink-0 gap-1 border-b border-white/10 p-2" role="group" aria-label="Library half">
                  {(['marks', 'fragments'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={insertMode === mode}
                      onClick={() => setInsertMode(mode)}
                      className={[
                        'flex-1 rounded-md px-2 py-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors focus:outline-none focus:ring-1 focus:ring-white/40',
                        insertMode === mode
                          ? 'bg-white/15 text-white'
                          : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80',
                      ].join(' ')}
                    >
                      {mode === 'marks' ? 'Marks' : 'Fragments'}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 flex-1">
                  {insertMode === 'marks' ? (
                    <SigilPalette
                      tint={CODEX_INK}
                      onPlace={(sigil) =>
                        addObject(makeSigilObject(sigil.id, { ...placeCentre(96), size: 96, name: sigil.name }))
                      }
                    />
                  ) : (
                    <FragmentPalette
                      tint={CODEX_INK}
                      onPlace={(fragment) => {
                        if (fragment.plate) {
                          // Grounds dress the plate itself rather than landing
                          // on top of whatever is already laid out.
                          updatePlate(activePlateId, fragment.plate);
                          flash(`Applied ${fragment.name} ground.`);
                          return;
                        }
                        const origin = placeFragment(fragment.width, fragment.height);
                        addObjects(fragment.build(origin.x, origin.y));
                        flash(`Placed ${fragment.name}.`);
                      }}
                    />
                  )}
                </div>
              </div>
            )}
            {tab === 'properties' && (
              <div className="h-full overflow-y-auto"><PropertiesPanel selected={selected} /></div>
            )}
            {tab === 'layers' && (
              <LayersPanel plate={plate} selectedIds={selectedIds} onSelect={(id) => select([id])} />
            )}
            {tab === 'documents' && (
              <DocumentsPanel
                saved={saved}
                onNew={() => { newDoc(); flash('New codex started.'); }}
                onOpen={(id) => {
                  const loaded = loadDocument(id);
                  if (loaded) { loadDoc(loaded); flash(`Opened “${loaded.title}”.`); }
                  else flash('That codex could not be read.');
                }}
                onDelete={(id) => { setSaved(deleteDocument(id)); flash('Deleted.'); }}
                onApplyTemplate={(templateId) => {
                  const template = PLATE_TEMPLATES.find((t) => t.id === templateId);
                  if (!template) return;
                  const built = template.build();
                  updatePlate(plate.id, built);
                  flash(`Applied “${template.name}”.`);
                }}
              />
            )}
          </div>
        </aside>

        {/* stage */}
        <main className="min-w-0 flex-1 overflow-auto bg-[#07060d] p-6">
          <div className="mx-auto w-fit shadow-2xl ring-1 ring-white/10">
            <CodexCanvas plate={plate} scale={zoom} stageRef={stageRef} />
          </div>
        </main>
      </div>

      {/* plate strip */}
      <footer className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-white/10 px-3 py-2">
        {doc.plates.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePlate(p.id)}
            className={[
              'shrink-0 rounded border px-3 py-1 text-[11px] transition-colors focus:outline-none focus:ring-1 focus:ring-white/40',
              p.id === plate.id
                ? 'border-amber-300/60 bg-amber-300/10 text-white'
                : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white/80',
            ].join(' ')}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={addPlate}
          className="shrink-0 rounded border border-white/15 px-2 py-1 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
        >
          + Plate
        </button>
        {doc.plates.length > 1 && (
          <button
            onClick={() => removePlate(plate.id)}
            className="shrink-0 rounded border border-white/10 px-2 py-1 text-[11px] text-white/40 hover:border-rose-400/40 hover:text-rose-300"
          >
            Remove
          </button>
        )}
      </footer>
    </div>
  );
}

function makeChart(pos: { x: number; y: number }): CodexObject {
  return {
    id: `chart_${Math.random().toString(36).slice(2, 10)}`,
    kind: 'chart',
    name: 'Stat chart',
    chartKind: 'radial',
    axes: [
      { label: 'AXIS ONE', value: 80 }, { label: 'AXIS TWO', value: 65 },
      { label: 'AXIS THREE', value: 72 }, { label: 'AXIS FOUR', value: 58 },
      { label: 'AXIS FIVE', value: 90 }, { label: 'AXIS SIX', value: 47 },
    ],
    max: 100,
    stroke: CODEX_INK,
    fill: 'rgba(216,180,90,0.16)',
    track: '#4a4361',
    labelColor: '#8a83a0',
    fontFamily: 'Cinzel',
    fontSize: 11,
    showLabels: true,
    showValues: true,
    x: pos.x, y: pos.y, width: 420, height: 380,
    rotation: 0, opacity: 1, locked: false, visible: true,
  } as CodexObject;
}

function ToolButton({
  icon: Icon, label, onClick, disabled,
}: { icon: typeof Save; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded border border-white/15 p-1.5 text-white/70 transition-colors hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-white/40"
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

function LayersPanel({
  plate, selectedIds, onSelect,
}: { plate: CodexPlate; selectedIds: string[]; onSelect: (id: string) => void }) {
  const updateObject = useCodexStore((s) => s.updateObject);
  const reorderObject = useCodexStore((s) => s.reorderObject);

  return (
    <div className="h-full overflow-y-auto p-2">
      {plate.objects.length === 0 && (
        <p className="p-3 text-xs text-white/40">This plate is empty.</p>
      )}
      {[...plate.objects].reverse().map((object) => (
        <div
          key={object.id}
          className={[
            'mb-1 flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs',
            selectedIds.includes(object.id)
              ? 'border-amber-300/50 bg-amber-300/10'
              : 'border-white/10 hover:border-white/25',
          ].join(' ')}
        >
          <button
            onClick={() => onSelect(object.id)}
            className="min-w-0 flex-1 truncate text-left text-white/75 hover:text-white focus:outline-none"
          >
            {object.name ?? object.kind}
          </button>
          <button
            onClick={() => updateObject(object.id, { visible: !object.visible })}
            aria-label={object.visible ? 'Hide' : 'Show'}
            className="px-1 text-white/35 hover:text-white/80"
          >
            {object.visible ? '◉' : '○'}
          </button>
          <button
            onClick={() => updateObject(object.id, { locked: !object.locked })}
            aria-label={object.locked ? 'Unlock' : 'Lock'}
            className="px-1 text-white/35 hover:text-white/80"
          >
            {object.locked ? '🔒' : '🔓'}
          </button>
          <button onClick={() => reorderObject(object.id, 'forward')} aria-label="Bring forward" className="px-1 text-white/35 hover:text-white/80">↑</button>
          <button onClick={() => reorderObject(object.id, 'backward')} aria-label="Send backward" className="px-1 text-white/35 hover:text-white/80">↓</button>
        </div>
      ))}
    </div>
  );
}

function DocumentsPanel({
  saved, onNew, onOpen, onDelete, onApplyTemplate,
}: {
  saved: CodexDocumentSummary[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onApplyTemplate: (id: string) => void;
}) {
  return (
    <div className="h-full space-y-4 overflow-y-auto p-3">
      <section className="space-y-2">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-white/40">Plate templates</h3>
        {PLATE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onApplyTemplate(t.id)}
            className="w-full rounded border border-white/10 p-2 text-left hover:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/40"
          >
            <div className="text-xs text-white/85">{t.name}</div>
            <div className="text-[10px] leading-snug text-white/40">{t.description}</div>
          </button>
        ))}
        <p className="text-[10px] leading-snug text-amber-300/60">
          Applying a template replaces the current plate's contents.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.14em] text-white/40">Saved codices</h3>
          <button onClick={onNew} className="text-[10px] text-white/50 hover:text-white">New</button>
        </div>
        {saved.length === 0 && <p className="text-[11px] text-white/35">Nothing saved yet.</p>}
        {saved.map((entry) => (
          <div key={entry.id} className="flex items-center gap-1.5 rounded border border-white/10 px-2 py-1.5">
            <button
              onClick={() => onOpen(entry.id)}
              className="min-w-0 flex-1 text-left focus:outline-none"
            >
              <div className="truncate text-xs text-white/80">{entry.title}</div>
              <div className="text-[10px] text-white/35">
                {entry.plateCount} plate{entry.plateCount === 1 ? '' : 's'} · {new Date(entry.updatedAt).toLocaleDateString()}
              </div>
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              aria-label={`Delete ${entry.title}`}
              className="px-1 text-white/30 hover:text-rose-300"
            >
              ×
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
