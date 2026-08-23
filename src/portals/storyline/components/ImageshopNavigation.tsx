import { memo } from 'react';

export type ImageshopSurfaceTab = 'compose' | 'import' | 'page-setup' | 'batch-json' | 'review';

const SURFACE_TABS: Array<{ value: ImageshopSurfaceTab; label: string; description: string }> = [
  { value: 'compose', label: 'Compose', description: 'Prompt, references, preview, and generation.' },
  { value: 'import', label: 'Import', description: 'Retouch or restyle an external image.' },
  { value: 'page-setup', label: 'Page setup', description: 'Style, continuity, page layout, and aspect.' },
  { value: 'batch-json', label: 'Batch JSON', description: 'Import and export production JSON batches.' },
  { value: 'review', label: 'Review', description: 'Dashboard status and refinement staging.' },
];

interface ImageshopSurfaceTabsProps {
  activeSurface: ImageshopSurfaceTab;
  onChange: (surface: ImageshopSurfaceTab) => void;
}

export const ImageshopSurfaceTabs = memo(function ImageshopSurfaceTabs({ activeSurface, onChange }: ImageshopSurfaceTabsProps) {
  return (
    <div className="mt-3 border border-white/10 bg-black/20 p-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Production Surface Tabs</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-5">
        {SURFACE_TABS.map((tab) => {
          const selected = activeSurface === tab.value;
          return (
            <button key={tab.value} type="button" aria-pressed={selected} title={tab.description} onClick={() => onChange(tab.value)} className={`border px-3 py-2 text-left text-xs ${selected ? 'border-amber-300 bg-amber-400/20 text-amber-100' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`}>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

interface ImageshopGuidedHeaderProps {
  contextLabel: string | null;
  hasPreview: boolean;
  canSendBack: boolean;
  onReturn: () => void;
  onScrollToSaveExport: () => void;
  onSendBack: () => void;
}

export const ImageshopGuidedHeader = memo(function ImageshopGuidedHeader({ contextLabel, hasPreview, canSendBack, onReturn, onScrollToSaveExport, onSendBack }: ImageshopGuidedHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-400/35 bg-[#050814]/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-2">
        <button type="button" onClick={onReturn} className="inline-flex h-9 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300/45 bg-amber-400/10 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-300/20">
          <span aria-hidden="true">&larr;</span><span>Back to Comic Creator</span>
        </button>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-white/80">Loaded from Guided Comic Flow</p>
          {contextLabel ? <p className="truncate text-[10px] text-amber-200/65">{contextLabel}</p> : null}
        </div>
      </div>
      <div className="min-w-0 flex-[1_1_12rem] text-center">
        <p className="truncate text-sm font-bold text-white">Illustrator&rsquo;s Imageshop</p>
        <p className="mt-0.5 truncate text-[10px] text-white/45">Generate, refine, save, and export visual assets</p>
      </div>
      <div className="flex min-w-0 flex-[1_1_10rem] items-center justify-end gap-2">
        <button type="button" disabled={!hasPreview} onClick={onScrollToSaveExport} className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-40">Save / Export</button>
        {canSendBack ? (
          <button type="button" onClick={onSendBack} className="inline-flex h-9 min-w-0 items-center justify-center rounded-lg px-3 text-center text-xs font-semibold text-black" style={{ background: 'linear-gradient(90deg, #D4AF37, #FBBF24)' }}>Send back to Guided Flow</button>
        ) : null}
      </div>
    </header>
  );
});
