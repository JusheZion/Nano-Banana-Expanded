type ImageshopOutputDestinationsProps = {
  hasPreview: boolean;
  hasSelectedBeat: boolean;
  canExportWriterImageMap: boolean;
  canReturnToWriter: boolean;
  canReturnToGuided: boolean;
  onChooseVaultTarget: (target: 'character' | 'asset' | 'npc') => void;
  onAssignSelectedBeat: () => void;
  onCreateNewBeat: () => void;
  onExportProductionJson: () => void;
  onExportWriterImageMap: () => void;
  onReturnToWriter: () => void;
  onReturnToGuided: () => void;
};

export function ImageshopOutputDestinations({
  hasPreview,
  hasSelectedBeat,
  canExportWriterImageMap,
  canReturnToWriter,
  canReturnToGuided,
  onChooseVaultTarget,
  onAssignSelectedBeat,
  onCreateNewBeat,
  onExportProductionJson,
  onExportWriterImageMap,
  onReturnToWriter,
  onReturnToGuided,
}: ImageshopOutputDestinationsProps) {
  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Output Destinations</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[9px] uppercase text-white/40">
        <span>Vault save</span>
        <span>Writer image map</span>
        <span>Guided return</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-9">
        {(['character', 'asset', 'npc'] as const).map((target) => (
          <button
            key={target}
            type="button"
            disabled={!hasPreview}
            onClick={() => onChooseVaultTarget(target)}
            className="border border-white/15 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/75 hover:bg-white/10 disabled:opacity-40"
            aria-label={`Save preview to ${target === 'npc' ? 'NPC' : `${target[0].toUpperCase()}${target.slice(1)}`} Vault`}
          >
            {target === 'npc' ? 'NPC Vault' : `${target[0].toUpperCase()}${target.slice(1)} Vault`}
          </button>
        ))}
        <button
          type="button"
          disabled={!hasPreview || !hasSelectedBeat}
          onClick={onAssignSelectedBeat}
          className="border border-white/15 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/75 hover:bg-white/10 disabled:opacity-40"
          aria-label="Assign preview to selected beat"
        >
          Assign beat
        </button>
        <button
          type="button"
          disabled={!hasPreview}
          onClick={onCreateNewBeat}
          className="border border-white/15 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/75 hover:bg-white/10 disabled:opacity-40"
          aria-label="Create a new beat from preview"
        >
          New beat
        </button>
        <button
          type="button"
          onClick={onExportProductionJson}
          className="border border-white/15 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/75 hover:bg-white/10"
          aria-label="Export Imageshop production JSON"
        >
          Production JSON
        </button>
        <button
          type="button"
          disabled={!canExportWriterImageMap}
          onClick={onExportWriterImageMap}
          className="border border-white/15 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/75 hover:bg-white/10 disabled:opacity-40"
          aria-label="Export Writer image map"
        >
          Writer map
        </button>
        <button
          type="button"
          disabled={!canReturnToWriter}
          onClick={onReturnToWriter}
          className="border border-white/15 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/75 hover:bg-white/10 disabled:opacity-40"
          aria-label="Send image map to Writers Workshop"
        >
          Return to Writer
        </button>
        <button
          type="button"
          disabled={!canReturnToGuided}
          onClick={onReturnToGuided}
          className="border border-white/15 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/75 hover:bg-white/10 disabled:opacity-40"
          aria-label="Send preview to Guided Comic Flow"
        >
          Guided Flow
        </button>
      </div>
      <p className="mt-2 text-[11px] text-white/55">
        {hasPreview
          ? 'Preview ready for vault save, beat assignment, export, or return when available.'
          : 'Generate a panel to unlock vault save, beat assignment, and return paths.'}
      </p>
    </div>
  );
}
