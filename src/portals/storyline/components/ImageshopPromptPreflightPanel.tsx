import type { ImageshopPromptPreflight } from '@/portals/storyline/imageshopPromptPreflight';

export type ImageshopPromptSectionSource =
  | 'Writer JSON'
  | 'Vault'
  | 'Lore'
  | 'Manual'
  | 'AI Helper'
  | 'Page Config';

export type ImageshopPromptPreflightSection = {
  id: string;
  label: string;
  value: string;
  sources: ImageshopPromptSectionSource[];
};

export function ImageshopPromptPreflightPanel({
  preflight,
  sections,
}: {
  preflight: ImageshopPromptPreflight;
  sections: ImageshopPromptPreflightSection[];
}) {
  const statusLabel =
    preflight.status === 'blocked'
      ? 'Preflight blocked'
      : preflight.status === 'warning'
        ? 'Review warnings'
        : 'Ready to generate';
  const knownMegabytes = preflight.payload.knownBytes / (1024 * 1024);

  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Prompt preflight</p>
        <span
          className={`text-[10px] font-semibold uppercase ${
            preflight.status === 'blocked'
              ? 'text-rose-200'
              : preflight.status === 'warning'
                ? 'text-amber-200'
                : 'text-emerald-200'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/55">
        <span>
          {preflight.payload.referenceCount} reference{preflight.payload.referenceCount === 1 ? '' : 's'}
        </span>
        <span>{knownMegabytes > 0 ? `${knownMegabytes.toFixed(1)} MB known` : 'Remote size unknown'}</span>
        <span>
          {preflight.payload.readyReferences} ready · {preflight.payload.unknownReferences} unchecked ·{' '}
          {preflight.payload.failedReferences} failed URLs
        </span>
        <span>{preflight.payload.likelyTimeout ? 'Timeout risk' : 'Payload healthy'}</span>
      </div>

      {preflight.diagnostics.length > 0 ? (
        <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
          {preflight.diagnostics.map((diagnostic) => (
            <p
              key={diagnostic.code}
              className={diagnostic.severity === 'error' ? 'text-[11px] text-rose-100' : 'text-[11px] text-amber-100'}
            >
              {diagnostic.message}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-3 space-y-2 border-t border-white/10 pt-2">
        {sections
          .filter((section) => section.value.trim())
          .map((section) => (
            <div key={section.id} className="text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-white/75">{section.label}</span>
                {section.sources.map((source) => (
                  <span
                    key={`${section.id}-${source}`}
                    className="border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase text-white/50"
                  >
                    {source}
                  </span>
                ))}
              </div>
              <p className="mt-1 line-clamp-2 text-white/50">{section.value}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
