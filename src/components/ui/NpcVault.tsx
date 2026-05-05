import React, { useMemo, useState } from 'react';
import { Copy, Trash2, X } from 'lucide-react';
import { Tooltip } from '@/shared/components/Tooltip';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';
import {
  deleteSupportingReferenceGenerationLocal,
  getGenerations,
  type StoredGeneration,
} from '@/shared/utils/generationOutputRouter';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export const NpcVault: React.FC = () => {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const guidedTarget = useGuidedComicVaultBridge((s) => s.pendingTarget);
  const selectGuidedReference = useGuidedComicVaultBridge((s) => s.selectVaultReference);

  const rows = useMemo(() => {
    void refreshNonce;
    const list = getGenerations('supporting_reference');
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [refreshNonce]);

  const selected = useMemo<StoredGeneration | null>(() => {
    if (!selectedId) return null;
    return rows.find((r) => r.id === selectedId) ?? null;
  }, [rows, selectedId]);

  return (
    <div className="w-full px-8 py-10">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-[#D4AF37]/25 bg-black/20 px-3 py-2 text-sm text-[#D4AF37]/80">
            References: <span className="font-medium text-[#FBF5D4]/90">{rows.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshNonce((n) => n + 1)}
            className="rounded-xl border border-[#D4AF37]/35 bg-black/30 px-4 py-2.5 text-sm text-[#FBF5D4] hover:bg-black/40"
          >
            Refresh
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-black/15 p-10 text-center">
          <p className="text-sm text-white/55">No NPC Vault images yet.</p>
          <p className="mt-2 text-xs text-white/40">
            Generate a quick ref in Illustrator’s Imageshop, then save it to the NPC Vault.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {rows.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedId(g.id)}
              className="group rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 overflow-hidden text-left"
            >
              <div className="aspect-square bg-black/40">
                <ArcsStorageImg src={g.url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <p className="text-[11px] text-white/80 truncate">
                  {g.supportingLabel?.trim() ? g.supportingLabel : 'NPC ref'}
                </p>
                <p className="text-[10px] text-white/45 truncate">{formatWhen(g.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-zinc-950/95 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div className="min-w-0">
                <p className="text-xs text-white/80 font-semibold truncate">
                  {selected.supportingLabel?.trim() ? selected.supportingLabel : 'NPC ref'}
                </p>
                <p className="text-[10px] text-white/45 truncate">{formatWhen(selected.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {guidedTarget?.type === 'npc' ? (
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-300/45 bg-emerald-300/15 px-3 py-2 text-xs font-black text-emerald-50 transition hover:bg-emerald-300/25"
                    title={`Use this image for ${guidedTarget.name}`}
                    onClick={() => {
                      const label = selected.supportingLabel?.trim() || 'NPC ref';
                      selectGuidedReference({
                        type: guidedTarget.type,
                        name: guidedTarget.name,
                        referenceId: selected.id,
                        imageUrl: selected.url,
                        sourceType: 'npc',
                        sourceLabel: label,
                        displayName: label,
                        imageLabel: label,
                      });
                    }}
                  >
                    Use for guided flow
                  </button>
                ) : null}
                <Tooltip content="Copy URL" side="bottom">
                  <button
                    type="button"
                    className="p-2 rounded-lg border border-white/15 hover:bg-white/10"
                    onClick={() => void navigator.clipboard.writeText(selected.url)}
                    aria-label="Copy URL"
                  >
                    <Copy className="w-4 h-4 text-white/80" />
                  </button>
                </Tooltip>
                <Tooltip content="Delete" side="bottom">
                  <button
                    type="button"
                    className="p-2 rounded-lg border border-red-500/30 hover:bg-red-950/40"
                    onClick={() => {
                      deleteSupportingReferenceGenerationLocal(selected.id);
                      setSelectedId(null);
                      setRefreshNonce((n) => n + 1);
                    }}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-200" />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  className="p-2 rounded-lg border border-white/15 hover:bg-white/10"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                <ArcsStorageImg src={selected.url} alt="" className="w-full max-h-[70vh] object-contain" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
