import { memo } from 'react';
import { PLATE_TEMPLATES } from '../data/plateTemplates';
import type { CodexPlate } from '../types/codexObjects';
import type { CodexDocumentSummary } from '../utils/codexPersistence';
import { useCodexStore } from '@/stores/codexStore';

interface LayersPanelProps {
  plate: CodexPlate;
  selectedIds: string[];
  onSelect: (id: string) => void;
}

export const CodexLayersPanel = memo(function CodexLayersPanel({
  plate,
  selectedIds,
  onSelect,
}: LayersPanelProps) {
  const updateObject = useCodexStore((state) => state.updateObject);
  const reorderObject = useCodexStore((state) => state.reorderObject);

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
});

interface DocumentsPanelProps {
  saved: CodexDocumentSummary[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onApplyTemplate: (id: string) => void;
}

export const CodexDocumentsPanel = memo(function CodexDocumentsPanel({
  saved,
  onNew,
  onOpen,
  onDelete,
  onApplyTemplate,
}: DocumentsPanelProps) {
  return (
    <div className="h-full space-y-4 overflow-y-auto p-3">
      <section className="space-y-2">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-white/40">Plate templates</h3>
        {PLATE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onApplyTemplate(template.id)}
            className="w-full rounded border border-white/10 p-2 text-left hover:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/40"
          >
            <div className="text-xs text-white/85">{template.name}</div>
            <div className="text-[10px] leading-snug text-white/40">{template.description}</div>
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
});
