import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import {
  BookMarked, FileDown, FilePlus2, ImageDown, Layers, Plus, Redo2, Save,
  Sparkles, Trash2, Type, Undo2,
} from 'lucide-react';
import { useCodexStore, makeSigilObject, makeTextObject } from '@/stores/codexStore';
import { SigilPalette } from '@/modes/codex/components/SigilPalette';
import { FragmentPalette } from '@/modes/codex/components/FragmentPalette';
import { FinishPicker } from '@/modes/codex/components/FinishPicker';
import {
  CodexContextMenu,
  CodexMenuBar,
  CodexShortcutsDialog,
  type ContextMenuTarget,
} from '@/modes/codex/components/CodexMenus';
import {
  commandForEvent,
  type CommandActions,
  type CommandState,
} from '@/modes/codex/commands/codexCommands';
import { PropertiesPanel } from '@/modes/codex/components/PropertiesPanel';
import {
  CodexDocumentsPanel,
  CodexLayersPanel,
} from '@/modes/codex/components/CodexDockPanels';
import { CodexCanvas } from '@/modes/codex/engine/CodexCanvas';
import { PLATE_TEMPLATES } from '@/modes/codex/data/plateTemplates';
import { getSigilFinish } from '@/modes/codex/data/sigilFinishes';
import { VaultPanel } from '@/modes/codex/components/VaultPanel';
import { TextEditorOverlay } from '@/modes/codex/components/TextEditorOverlay';
import { useVaultStore } from '@/stores/vaultStore';
import { indexEntries, resolveBindings } from '@/modes/codex/vault/vaultBinding';
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
import { useMediaQuery } from '@/modes/codex/hooks/useMediaQuery';
import { waitForStagePlate } from '@/modes/codex/utils/stageCapture';
import {
  readCodexSession,
  writeCodexSession,
  type CodexDockTab,
} from '@/modes/codex/utils/codexSession';

const ZOOM_STEPS = [0.25, 0.35, 0.45, 0.55, 0.7, 0.85, 1, 1.25, 1.5, 2];

/** Cascade geometry for successive insertions. */
const CASCADE_STEP = 28;
const CASCADE_WRAP = 8;

export function CodexStudio() {
  const initialSession = useMemo(readCodexSession, []);
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
  const clipboard = useCodexStore((s) => s.clipboard);
  const copyObjects = useCodexStore((s) => s.copyObjects);
  const cutObjects = useCodexStore((s) => s.cutObjects);
  const pasteClipboard = useCodexStore((s) => s.pasteClipboard);
  const selectAll = useCodexStore((s) => s.selectAll);
  const nudgeObjects = useCodexStore((s) => s.nudgeObjects);
  const clearSelection = useCodexStore((s) => s.clearSelection);
  const vaultStatus = useVaultStore((s) => s.status);
  const connectVault = useVaultStore((s) => s.connect);
  const refreshVault = useVaultStore((s) => s.refresh);
  const reorderObject = useCodexStore((s) => s.reorderObject);
  const canUndo = useCodexStore((s) => s.canUndo);
  const canRedo = useCodexStore((s) => s.canRedo);

  const [tab, setTab] = useState<CodexDockTab>(initialSession.tab);
  /** Which half of the library the Insert tab is showing. */
  const [insertMode, setInsertMode] = useState<'marks' | 'fragments'>('marks');
  const [zoom, setZoom] = useState(initialSession.zoom);
  const [contextTarget, setContextTarget] = useState<ContextMenuTarget | null>(null);
  /**
   * Below this the dock cannot share the width with the plate, so it becomes an
   * overlay the user opens rather than a column that squeezes the canvas to a
   * sliver.
   */
  const isNarrow = useMediaQuery('(max-width: 899px)');
  const [dockOpen, setDockOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  /** Id of the text object being edited in place on the canvas. */
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
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
  /** Highlights the note the selection is already bound to, if they agree on one. */
  const boundNotePath = useMemo(() => {
    const paths = selected
      .map((o) => (o.kind === 'text' || o.kind === 'chart' ? o.binding?.notePath : undefined))
      .filter(Boolean);
    return paths.length && paths.every((p) => p === paths[0]) ? paths[0] : undefined;
  }, [selected]);

  /** The text object currently being edited on the canvas, if any. */
  const editingText = useMemo(() => {
    if (!editingTextId || !plate) return null;
    const found = plate.objects.find((o) => o.id === editingTextId);
    return found?.kind === 'text' ? found : null;
  }, [editingTextId, plate]);

  // A plate change, deletion, or document load can remove the object while its
  // editor is open. Clear the orphaned id so global shortcuts do not remain
  // disabled for the rest of the session.
  useEffect(() => {
    if (editingTextId && !editingText) setEditingTextId(null);
  }, [editingTextId, editingText]);

  const selectedSigilIds = useMemo(
    () => selected.filter((o) => o.kind === 'sigil').map((o) => o.id),
    [selected],
  );

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

  const handleSave = useCallback(() => {
    const next = saveDocument(doc);
    if (!next) {
      flash('Save failed — browser storage is unavailable or full.');
      return;
    }
    setSaved(next);
    flash(`Saved “${doc.title}”.`);
  }, [doc, flash]);

  const handleExportPng = useCallback(() => {
    if (!stageRef.current || !plate) return;
    exportStagePng(stageRef.current, safeFilename(`${doc.title}-${plate.name}`, 'png'));
    flash('PNG exported.');
  }, [doc.title, plate, flash]);

  const handleExportPdf = useCallback(async () => {
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
  }, [doc.plates, doc.title, activePlateId, setActivePlate, flash]);

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

  const mainRef = useRef<HTMLElement | null>(null);
  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    [],
  );

  useEffect(() => { writeCodexSession({ tab, zoom }); }, [tab, zoom]);

  // Leaving narrow mode must not strand the overlay open over a wide layout.
  useEffect(() => { if (!isNarrow) setDockOpen(false); }, [isNarrow]);

  // On a narrow screen the dock covers the plate, so opening a panel from a
  // command has to open the drawer too or the command looks like it did nothing.
  const showPanel = useCallback((next: CodexDockTab) => {
    setTab(next);
    setDockOpen(true);
  }, []);

  const stepZoom = useCallback((delta: number) => {
    setZoom((current) => {
      const i = ZOOM_STEPS.findIndex((z) => z >= current - 0.001);
      const next = Math.min(Math.max((i < 0 ? ZOOM_STEPS.length - 1 : i) + delta, 0), ZOOM_STEPS.length - 1);
      return ZOOM_STEPS[next];
    });
  }, []);

  const zoomFit = useCallback(() => {
    const box = mainRef.current;
    if (!box || !plate) return;
    const fit = Math.min(
      (box.clientHeight - 48) / plate.height,
      (box.clientWidth - 48) / plate.width,
    );
    setZoom(Math.max(0.1, Math.min(2, fit)));
  }, [plate]);

  const movePlate = useCallback(
    (delta: number) => {
      const i = doc.plates.findIndex((p) => p.id === activePlateId);
      if (i < 0) return;
      const next = doc.plates[(i + delta + doc.plates.length) % doc.plates.length];
      setActivePlate(next.id);
    },
    [doc.plates, activePlateId, setActivePlate],
  );

  const toggleFlag = useCallback(
    (flag: 'locked' | 'visible') => {
      if (selected.length === 0) return;
      // Mixed selections all take the majority's opposite, so one press is
      // decisive rather than inverting each object independently.
      const on = selected.filter((o) => o[flag]).length;
      updateObjects(selectedIds, { [flag]: !(on > selected.length / 2) } as Partial<CodexObject>);
    },
    [selected, selectedIds, updateObjects],
  );

  const commandState: CommandState = useMemo(
    () => ({
      selectionCount: selectedIds.length,
      clipboardCount: clipboard.length,
      canUndo: canUndo(),
      canRedo: canRedo(),
      plateCount: doc.plates.length,
      objectCount: plate?.objects.length ?? 0,
      vaultReady: vaultStatus === 'ready',
    }),
    [selectedIds.length, clipboard.length, canUndo, canRedo, doc.plates.length, plate, vaultStatus],
  );

  /**
   * Re-reads the vault, then pushes every live binding's current value onto the
   * plates. Unresolvable bindings are reported rather than applied — a renamed
   * note must not silently blank a title.
   */
  const applyVaultBindings = useCallback(() => {
    const index = indexEntries(useVaultStore.getState().entries);
    const objects = doc.plates.flatMap((p) => p.objects);
    const report = resolveBindings(objects, index, new Date().toISOString());
    if (report.patches.length) applyPatches(report.patches);

    const problems = report.missingNotes.length + report.missingFields.length;
    const updated = report.patches.length;
    if (!updated && !problems) return 'Vault re-read — everything already matches canon.';
    return [
      updated ? `Updated ${updated} object${updated === 1 ? '' : 's'}` : 'Nothing to update',
      problems ? `${problems} binding${problems === 1 ? '' : 's'} could not be resolved` : '',
    ].filter(Boolean).join(' · ') + '.';
  }, [doc.plates, applyPatches]);

  const commandActions: CommandActions = useMemo(
    () => ({
      newDocument: () => handleNewDocument(),
      save: () => handleSave(),
      exportPng: () => handleExportPng(),
      exportPdf: () => void handleExportPdf(),
      undo,
      redo,
      cut: () => cutObjects(selectedIds),
      copy: () => { copyObjects(selectedIds); flash(`Copied ${selectedIds.length} object(s).`); },
      paste: pasteClipboard,
      duplicate: () => duplicateObjects(selectedIds),
      remove: () => removeObjects(selectedIds),
      selectAll,
      deselect: clearSelection,
      bringToFront: () => selectedIds.forEach((id) => reorderObject(id, 'front')),
      bringForward: () => selectedIds.forEach((id) => reorderObject(id, 'forward')),
      sendBackward: () => selectedIds.forEach((id) => reorderObject(id, 'backward')),
      sendToBack: () => selectedIds.forEach((id) => reorderObject(id, 'back')),
      toggleLock: () => toggleFlag('locked'),
      toggleVisible: () => toggleFlag('visible'),
      addText: () => {
        const object = makeTextObject({ ...placeCentre(360), width: 360 });
        addObject(object);
        // Straight into editing: adding text and getting no caret is what made
        // this feel broken.
        setEditingTextId(object.id);
      },
      addChart: () => addObject(makeChart(placeCentre(420))),
      addPlate,
      removePlate: () => plate && removePlate(plate.id),
      nextPlate: () => movePlate(1),
      previousPlate: () => movePlate(-1),
      zoomIn: () => stepZoom(1),
      zoomOut: () => stepZoom(-1),
      zoomFit,
      zoomActual: () => setZoom(1),
      openInsert: () => showPanel('sigils'),
      openProperties: () => showPanel('properties'),
      openLayers: () => showPanel('layers'),
      openFiles: () => showPanel('documents'),
      openVault: () => showPanel('vault'),
      connectVault: () => {
        showPanel('vault');
        void connectVault();
      },
      refreshVault: () => {
        void refreshVault().then((refreshed) => {
          if (refreshed) flash(applyVaultBindings());
        });
      },
      showShortcuts: () => setShortcutsOpen(true),
    }),
    [
      handleNewDocument, handleSave, handleExportPng, handleExportPdf, undo, redo, cutObjects,
      copyObjects, pasteClipboard, duplicateObjects, removeObjects, selectAll, clearSelection,
      reorderObject, toggleFlag, addObject, placeCentre, addPlate, removePlate, plate, movePlate,
      stepZoom, zoomFit, selectedIds, flash, showPanel, connectVault, refreshVault, applyVaultBindings,
    ],
  );

  const commandContext = useMemo(
    () => ({ ...commandState, ...commandActions }),
    [commandState, commandActions],
  );

  /**
   * Shortcuts dispatch through the same command table the menus use, so a
   * shortcut can never do something different from its menu item.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingText) return;
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;

      // Arrow nudging is a held-key interaction rather than a menu command, so
      // it is handled here rather than in the table.
      const nudges: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      };
      const nudge = nudges[e.key];
      if (nudge && selectedIds.length && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const scale = e.shiftKey ? 10 : 1;
        nudgeObjects(selectedIds, nudge[0] * scale, nudge[1] * scale);
        return;
      }

      if (e.key === 'Escape' && (contextTarget || shortcutsOpen)) {
        e.preventDefault();
        setContextTarget(null);
        setShortcutsOpen(false);
        return;
      }

      const command = commandForEvent(e, commandState, isMac);
      if (command) {
        e.preventDefault();
        command.run(commandContext);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandState, commandContext, isMac, selectedIds, nudgeObjects, contextTarget, shortcutsOpen, editingText]);

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

        {isNarrow && (
          <button
            type="button"
            onClick={() => setDockOpen((open) => !open)}
            aria-expanded={dockOpen}
            aria-label={dockOpen ? 'Hide panels' : 'Show panels'}
            className="rounded border border-white/20 px-2 py-1 text-[11px] text-white/75 transition-colors hover:border-white/40 hover:text-white focus:outline-none focus:ring-1 focus:ring-white/50"
          >
            Panels
          </button>
        )}

        <CodexMenuBar state={commandState} ctx={commandContext} isMac={isMac} />
        <div className="mx-1 h-5 w-px bg-white/10" />

        {!isNarrow && (
          <>
            <ToolButton icon={Undo2} label="Undo" onClick={undo} />
            <ToolButton icon={Redo2} label="Redo" onClick={redo} />
            <div className="mx-1 h-5 w-px bg-white/10" />
          </>
        )}

        <ToolButton
          icon={Type}
          label="Add text"
          onClick={commandActions.addText}
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

        {/* All three are in the File menu; on a narrow header they cost a whole
            row of height for nothing. */}
        {!isNarrow && (
          <>
            <ToolButton icon={Save} label="Save" onClick={handleSave} />
            <ToolButton icon={ImageDown} label="Export PNG" onClick={handleExportPng} />
            <ToolButton icon={FileDown} label="Export PDF" onClick={() => void handleExportPdf()} />
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {status && <span className="text-[11px] text-amber-300/80">{status}</span>}
          {/* The slider needs width the narrow header does not have; the
              percentage still shows, and zoom stays on the View menu. */}
          <label className="hidden items-center gap-1.5 text-[11px] text-white/45 md:flex">
            Zoom
            <input
              type="range" min={0.2} max={1.2} step={0.05} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 w-24 accent-amber-300"
              aria-label="Zoom"
            />
            <span className="w-8 tabular-nums text-right">{Math.round(zoom * 100)}%</span>
          </label>
          <span className="text-[11px] tabular-nums text-white/45 md:hidden">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* dock */}
        {isNarrow && dockOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/50"
            onClick={() => setDockOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          aria-label="Codex panels"
          aria-hidden={isNarrow && !dockOpen}
          className={[
            'flex shrink-0 flex-col border-r border-white/10 bg-black/25',
            isNarrow
              ? [
                  'absolute inset-y-0 left-0 z-40 w-[min(20rem,88vw)] shadow-2xl transition-transform duration-200',
                  dockOpen ? 'translate-x-0' : '-translate-x-full',
                ].join(' ')
              : 'w-[310px]',
          ].join(' ')}
        >
          <nav className="flex shrink-0 border-b border-white/10" role="tablist">
            {([
              ['sigils', 'Insert', Sparkles],
              ['properties', 'Properties', Type],
              ['layers', 'Layers', Layers],
              ['documents', 'Files', FilePlus2],
              ['vault', 'Vault', BookMarked],
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
                {/* Selecting something on the plate has to show somewhere the
                    user is already looking, or the panel stays undiscovered. */}
                {id === 'properties' && selectedIds.length > 0 && (
                  <span
                    aria-label={`${selectedIds.length} selected`}
                    className="ml-0.5 rounded-full bg-amber-300/25 px-1.5 py-px text-[9px] font-medium tabular-nums text-amber-100"
                  >
                    {selectedIds.length}
                  </span>
                )}
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
                      {/* Collapsed by default: ten swatches plus their label and
                          action cost ~150px, and the finish is set once and then
                          left alone, whereas the mark grid is used constantly. */}
                      <details className="shrink-0 border-b border-white/10">
                        <summary className="cursor-pointer list-none px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/40 transition-colors hover:text-white/70">
                          Finish · {getSigilFinish(sigilFinishId)?.name ?? 'Custom'}
                        </summary>
                        <div className="px-3 pb-3">
                        <FinishPicker
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
                      </details>
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
            {tab === 'vault' && (
              <VaultPanel
                boundNotePath={boundNotePath}
                onRefreshed={() => flash(applyVaultBindings())}
                onUseNote={(entry) => {
                  if (selectedIds.length === 0) {
                    flash('Select a text or chart object first, then pick a note.');
                    return;
                  }
                  const bindable = selected.filter((o) => o.kind === 'text' || o.kind === 'chart');
                  if (bindable.length === 0) {
                    flash('Only text and charts can be bound to canon.');
                    return;
                  }
                  applyPatches(
                    bindable.map((o) => ({
                      id: o.id,
                      patch: {
                        binding: {
                          notePath: entry.sourcePath,
                          field: o.kind === 'text' ? 'title' : '',
                          mode: 'live' as const,
                        },
                      } as Partial<CodexObject>,
                    })),
                  );
                  setTab('properties');
                  flash(`Bound to “${entry.title}”. Choose a field in Properties.`);
                }}
              />
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
        <main ref={mainRef} className="relative min-w-0 flex-1 overflow-auto bg-[#07060d] p-6">
          <div className="mx-auto w-fit shadow-2xl ring-1 ring-white/10">
            <CodexCanvas
              plate={plate}
              scale={zoom}
              stageRef={stageRef}
              onContextMenu={setContextTarget}
              onObjectActivate={() => {
                const one = selected.length === 1 ? selected[0] : null;
                if (one?.kind === 'text') setEditingTextId(one.id);
                else showPanel('properties');
              }}
            />
          </div>

          {plate.objects.length === 0 && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center p-8"
              aria-live="polite"
            >
              <div className="max-w-xs rounded-lg border border-white/10 bg-black/55 px-5 py-4 text-center backdrop-blur-sm">
                <p className="text-[13px] text-white/70">This plate is empty.</p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/45">
                  Pick a mark or fragment from the Insert panel, or right-click the plate for
                  quick actions. Press{' '}
                  <kbd className="rounded border border-white/20 px-1 font-mono text-[10px]">
                    {isMac ? '⌘/' : 'Ctrl+/'}
                  </kbd>{' '}
                  for shortcuts.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {contextTarget && (
        <CodexContextMenu
          target={contextTarget}
          state={commandState}
          ctx={commandContext}
          isMac={isMac}
          onClose={() => setContextTarget(null)}
        />
      )}

      {shortcutsOpen && (
        <CodexShortcutsDialog isMac={isMac} onClose={() => setShortcutsOpen(false)} />
      )}

      {editingText && stageRef.current && (
        <TextEditorOverlay
          object={editingText}
          stage={stageRef.current}
          scale={zoom}
          onCommit={(text) => {
            updateObjects([editingText.id], { text } as Partial<CodexObject>);
            setEditingTextId(null);
          }}
          onCancel={() => setEditingTextId(null)}
        />
      )}

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
