import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import {
  FileDown, FilePlus2, ImageDown, Layers, Plus, Redo2, Save,
  Sparkles, Trash2, Type, Undo2,
} from 'lucide-react';
import { useCodexStore, makeSigilObject, makeTextObject } from '@/stores/codexStore';
import { SigilPalette } from '@/modes/codex/components/SigilPalette';
import { FragmentPalette } from '@/modes/codex/components/FragmentPalette';
import { FinishPicker } from '@/modes/codex/components/FinishPicker';
import { PropertiesPanel } from '@/modes/codex/components/PropertiesPanel';
import {
  CodexDocumentsPanel,
  CodexLayersPanel,
} from '@/modes/codex/components/CodexDockPanels';
import { CodexCanvas } from '@/modes/codex/engine/CodexCanvas';
import { PLATE_TEMPLATES } from '@/modes/codex/data/plateTemplates';
import { getSigilFinish } from '@/modes/codex/data/sigilFinishes';
import { inkForPlate, isLightPlate, reinkPatches } from '@/modes/codex/utils/plateInk';
import {
  CODEX_INK, type CodexChartObject, type CodexObject, type CodexPlate,
} from '@/modes/codex/types/codexObjects';
import {
  listDocuments, saveDocument, loadDocument, deleteDocument,
  type CodexDocumentSummary,
} from '@/modes/codex/utils/codexPersistence';
import {
  buildPdf, exportStagePng, rasterisePlate, safeFilename,
} from '@/modes/codex/utils/codexExport';
import { useTransientStatus } from '@/modes/codex/hooks/useTransientStatus';
import { waitForStagePlate } from '@/modes/codex/utils/stageCapture';

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
  const sigilFinishId = useCodexStore((s) => s.sigilFinishId);
  const setSigilFinish = useCodexStore((s) => s.setSigilFinish);
  const updateObjects = useCodexStore((s) => s.updateObjects);
  const applyPatches = useCodexStore((s) => s.applyPatches);
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
  const { status, flash } = useTransientStatus(2600);
  const stageRef = useRef<Konva.Stage | null>(null);
  const exportControllerRef = useRef(new AbortController());
  const exportInProgressRef = useRef(false);

  useEffect(() => { setSaved(listDocuments()); }, []);
  useEffect(() => () => exportControllerRef.current.abort(), []);

  const plate: CodexPlate | undefined = useMemo(
    () => doc.plates.find((p) => p.id === activePlateId) ?? doc.plates[0],
    [doc.plates, activePlateId],
  );

  const selected: CodexObject[] = useMemo(
    () => (plate ? plate.objects.filter((o) => selectedIds.includes(o.id)) : []),
    [plate, selectedIds],
  );
  const selectedSigilIds = useMemo(
    () => selected.filter((o) => o.kind === 'sigil').map((o) => o.id),
    [selected],
  );

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
    const next = saveDocument(doc);
    if (!next) {
      flash('Save failed — browser storage is unavailable or full.');
      return;
    }
    setSaved(next);
    flash(`Saved “${doc.title}”.`);
  };

  const handleExportPng = () => {
    if (!stageRef.current || !plate) return;
    exportStagePng(stageRef.current, safeFilename(`${doc.title}-${plate.name}`, 'png'));
    flash('PNG exported.');
  };

  const handleExportPdf = async () => {
    if (!stageRef.current) return;
    if (exportInProgressRef.current) {
      flash('A PDF export is already in progress.');
      return;
    }
    exportInProgressRef.current = true;
    const original = activePlateId;
    const rasters = [];
    const signal = exportControllerRef.current.signal;
    try {
      for (const p of doc.plates) {
        setActivePlate(p.id);
        const ready = await waitForStagePlate(() => stageRef.current, p.id, { signal });
        if (!ready) {
          if (!signal.aborted) flash(`PDF export stopped — “${p.name}” did not finish rendering.`);
          return;
        }
        const stage = stageRef.current;
        if (!stage) return;
        rasters.push(rasterisePlate(stage, p));
      }
      buildPdf(rasters, safeFilename(doc.title, 'pdf'));
      flash(`PDF exported — ${rasters.length} page${rasters.length === 1 ? '' : 's'}.`);
    } finally {
      setActivePlate(original);
      exportInProgressRef.current = false;
    }
  };

  const handleLayerSelect = useCallback((id: string) => select([id]), [select]);
  const handleNewDocument = useCallback(() => {
    newDoc();
    flash('New codex started.');
  }, [flash, newDoc]);
  const handleOpenDocument = useCallback((id: string) => {
    const loaded = loadDocument(id);
    if (loaded) {
      loadDoc(loaded);
      flash(`Opened “${loaded.title}”.`);
    } else {
      flash('That codex could not be read.');
    }
  }, [flash, loadDoc]);
  const handleDeleteDocument = useCallback((id: string) => {
    const next = deleteDocument(id);
    if (!next) {
      flash('Delete failed — browser storage is unavailable.');
      return;
    }
    setSaved(next);
    flash('Deleted.');
  }, [flash]);
  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = PLATE_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template || !plate) return;
    updatePlate(plate.id, template.build());
    flash(`Applied “${template.name}”.`);
  }, [flash, plate, updatePlate]);

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
                    <div className="flex h-full flex-col">
                      <div className="shrink-0 border-b border-white/10 p-3">
                        <FinishPicker
                          label="Finish for new marks"
                          value={sigilFinishId}
                          onChange={setSigilFinish}
                          action={{
                            label: 'Apply to selection',
                            disabled: selectedSigilIds.length === 0,
                            onClick: () => {
                              const finish = getSigilFinish(sigilFinishId);
                              if (!finish) return;
                              updateObjects(selectedSigilIds, finish.patch);
                              flash(`Applied ${finish.name} to ${selectedSigilIds.length} mark(s).`);
                            },
                          }}
                        />
                      </div>
                      <div className="min-h-0 flex-1">
                        <SigilPalette
                          tint={CODEX_INK}
                          appearance={{
                            tint: getSigilFinish(sigilFinishId)?.patch.tint ?? CODEX_INK,
                            gradient: getSigilFinish(sigilFinishId)?.patch.gradient,
                            bevel: getSigilFinish(sigilFinishId)?.patch.bevel,
                          }}
                          onPlace={(sigil) =>
                            addObject(
                              makeSigilObject(sigil.id, {
                                ...placeCentre(96),
                                size: 96,
                                name: sigil.name,
                                finishId: sigilFinishId,
                              }),
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <FragmentPalette
                      tint={CODEX_INK}
                      onPlace={(fragment) => {
                        if (fragment.plate) {
                          // Grounds dress the plate itself rather than landing
                          // on top of whatever is already laid out.
                          updatePlate(activePlateId, fragment.plate);

                          // Gold is illegible on parchment, so a light ground
                          // re-inks what is already on the plate. Committed as
                          // its own undo step, so the re-ink can be dropped
                          // without losing the ground.
                          const next = { ...plate, ...fragment.plate } as typeof plate;
                          if (next && plate && isLightPlate(next) !== isLightPlate(plate)) {
                            const palette = inkForPlate(next);
                            const finish = getSigilFinish(palette.finishId);
                            const patches = reinkPatches(
                              plate.objects,
                              palette,
                              finish?.patch ?? { tint: palette.ink },
                            );
                            applyPatches(patches);
                            setSigilFinish(palette.finishId);
                            flash(
                              patches.length
                                ? `Applied ${fragment.name} ground and re-inked ${patches.length} object(s).`
                                : `Applied ${fragment.name} ground.`,
                            );
                            return;
                          }
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
              <CodexLayersPanel plate={plate} selectedIds={selectedIds} onSelect={handleLayerSelect} />
            )}
            {tab === 'documents' && (
              <CodexDocumentsPanel
                saved={saved}
                onNew={handleNewDocument}
                onOpen={handleOpenDocument}
                onDelete={handleDeleteDocument}
                onApplyTemplate={handleApplyTemplate}
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

function makeChart(pos: { x: number; y: number }): CodexChartObject {
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
  };
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
