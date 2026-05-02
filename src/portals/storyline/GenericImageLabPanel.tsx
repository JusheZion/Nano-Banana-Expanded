import { useCallback, useEffect, useMemo, useState } from 'react';

function formatGeminiClientError(message: string): string {
  if (message.includes('VITE_GEMINI_API_KEY')) {
    return 'Gemini API key is not available in this build. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server (same variable Character and Asset studios use).';
  }
  return message;
}
import { generateGeminiText } from '@/shared/api/geminiTextApi';
import { generateImage, type OnyxModelId } from '@/shared/api/geminiImageApi';
import { Tooltip } from '@/shared/components/Tooltip';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';
import { parseJsonFromModel } from '@/portals/storyline/parseDirectorJson';
import type {
  ProductionAssetMember,
  ProductionCastMember,
  ProductionSupportingRefMember,
  StoryBeat,
  StoryBeatAspectRatio,
} from '@/portals/storyline/storylineTypes';
import { buildStorylineReferenceSlots } from '@/portals/storyline/buildStorylineReferenceSlots';
import { useCharacterStudioStore } from '@/stores/characterStudioStore';
import { useAssetStudioStore } from '@/stores/assetStudioStore';
import { pickGenerationSeed } from '@/shared/utils/generationSeed';
import {
  studioPreviewAspectCss,
  studioPreviewMaxHeightCss,
  type StudioPreviewAspectId,
} from '@/shared/utils/studioPreviewLayout';
import { ImageshopImportPanel } from '@/portals/storyline/ImageshopImportPanel';
import { useImageWorkshopBridge, type GuidedImageWorkshopHandoff } from '@/stores/imageWorkshopBridge';

type LabContext = 'character' | 'asset';

function listOrNone(values: string[] | undefined): string {
  const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(', ') : 'None specified';
}

function buildGuidedPanelPrompt(handoff: GuidedImageWorkshopHandoff): string {
  const pageNumber = handoff.pageNumber ?? '?';
  const panelNumber = handoff.panelNumber ?? '?';
  const pageSummary = handoff.pageSummary?.trim() || 'No page summary provided.';
  const panelBeat = handoff.panelBeat?.trim() || 'No panel beat provided.';
  const characters = listOrNone(handoff.pageKeyCharacters);
  const location = handoff.pageKeyLocation?.trim() || 'No location specified';

  return [
    `Create comic panel art for Page ${pageNumber}, Panel ${panelNumber}.`,
    `Page summary: ${pageSummary}`,
    `Panel beat: ${panelBeat}`,
    `Characters: ${characters}`,
    `Location: ${location}`,
    'Compose this as a clear, cinematic comic-book panel with strong storytelling, consistent character design, readable action, and polished lighting.',
  ].join('\n');
}

export function GenericImageLabPanel({
  selectedBeat,
  productionCast,
  productionAssets,
  productionSupportingRefs,
  onUseAsSelectedBeat,
  onCreateNewBeat,
  seedPrompt,
  onSeedPromptConsumed,
}: {
  selectedBeat: StoryBeat | null;
  productionCast: ProductionCastMember[];
  productionAssets: ProductionAssetMember[];
  productionSupportingRefs: ProductionSupportingRefMember[];
  onUseAsSelectedBeat: (args: {
    imageUrl: string;
    seed: number | null;
    aspectRatio: StoryBeatAspectRatio;
    visualPrompt: string;
  }) => void;
  onCreateNewBeat: (args: {
    imageUrl: string;
    seed: number | null;
    aspectRatio: StoryBeatAspectRatio;
    visualPrompt: string;
  }) => void;
  seedPrompt?: string | null;
  onSeedPromptConsumed?: () => void;
}) {
  const consumeGuidedComicHandoff = useImageWorkshopBridge((s) => s.consumeGuidedComicHandoff);
  const sendGuidedComicPanelImageBack = useImageWorkshopBridge((s) => s.sendGuidedComicPanelImageBack);
  const [refs, setRefs] = useState<string[]>(() => Array.from({ length: 14 }, () => ''));
  const [context, setContext] = useState<LabContext>('character');
  const [modelId] = useState<OnyxModelId>('pro');
  const [aspectRatio, setAspectRatio] = useState<StoryBeatAspectRatio>('9:16');

  const [promptRaw, setPromptRaw] = useState('');
  const [promptRefined, setPromptRefined] = useState('');
  /** After a successful AI refine, this can be turned on; default false so raw textarea drives generation. */
  const [useRefinedPrompt, setUseRefinedPrompt] = useState(false);

  const [aiBusy, setAiBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);
  const [lastSeed, setLastSeed] = useState<number | null>(null);
  const [guidedPanelTarget, setGuidedPanelTarget] = useState<GuidedImageWorkshopHandoff | null>(null);

  useEffect(() => {
    const next = seedPrompt?.trim();
    if (!next) return;
    setPromptRaw(next);
    setUseRefinedPrompt(false);
    setError(null);
    setNotice('Visual Prep seeded Image Lab with the selected prompt.');
    onSeedPromptConsumed?.();
  }, [seedPrompt, onSeedPromptConsumed]);

  const stableRefs = useMemo(
    () => Array.from({ length: 14 }, (_, i) => refs[i] ?? ''),
    [refs]
  );

  /** Prefer refined text when enabled and present; otherwise use raw (avoids empty refined + default toggle blocking generation). */
  const effectivePrompt = useMemo(() => {
    const raw = promptRaw.trim();
    const refined = promptRefined.trim();
    if (useRefinedPrompt && refined) return refined;
    if (raw) return raw;
    return refined;
  }, [promptRaw, promptRefined, useRefinedPrompt]);

  const applyRefs = useCallback((incoming: string[], nextContext: LabContext) => {
    const next = Array.from({ length: 14 }, (_, i) => incoming[i] ?? '');
    setRefs(next);
    setContext(nextContext);
    setNotice(null);
  }, []);

  useEffect(() => {
    const handoff = consumeGuidedComicHandoff();
    if (!handoff) return;

    const incoming = [...handoff.characters, ...handoff.locations]
      .map((reference) => reference.imageUrl)
      .filter(Boolean);

    if (handoff.currentStep === 'art') {
      setGuidedPanelTarget(handoff);
      if (incoming.length > 0) {
        applyRefs(incoming, handoff.characters.length > 0 ? 'character' : 'asset');
      }
      setPromptRaw(buildGuidedPanelPrompt(handoff));
      setPromptRefined('');
      setUseRefinedPrompt(false);
      setError(null);
      setNotice(`Loaded panel from Guided Comic Flow: Page ${handoff.pageNumber ?? '?'}, Panel ${handoff.panelNumber ?? '?'}`);
      return;
    }

    if (incoming.length === 0) return;

    applyRefs(incoming, handoff.characters.length > 0 ? 'character' : 'asset');
    setNotice('Loaded references from Guided Comic Flow');
  }, [applyRefs, consumeGuidedComicHandoff]);

  const sendBackToGuidedComicFlow = useCallback(() => {
    if (!guidedPanelTarget || !lastImageUrl || !guidedPanelTarget.pageNumber || !guidedPanelTarget.panelNumber) return;

    sendGuidedComicPanelImageBack({
      panelId: guidedPanelTarget.panelId,
      pageNumber: guidedPanelTarget.pageNumber,
      panelNumber: guidedPanelTarget.panelNumber,
      imageUrl: lastImageUrl,
      seed: lastSeed,
      prompt: effectivePrompt,
    });
  }, [effectivePrompt, guidedPanelTarget, lastImageUrl, lastSeed, sendGuidedComicPanelImageBack]);

  const getStudioRefs = useCallback((source: 'character' | 'asset'): string[] => {
    if (source === 'character') return useCharacterStudioStore.getState().referenceImageUrls;
    return useAssetStudioStore.getState().referenceImageUrls;
  }, []);

  const replaceFromStudio = useCallback(
    (source: 'character' | 'asset') => {
      const urls = getStudioRefs(source);
      if (!urls.some(Boolean)) {
        setNotice(
          source === 'character'
            ? 'No references in Character Studio yet. Add refs there first, then try again.'
            : 'No references in Assets Studio yet. Add refs there first, then try again.'
        );
        return;
      }
      applyRefs(urls, source === 'character' ? 'character' : 'asset');
    },
    [applyRefs, getStudioRefs]
  );

  const addFromStudio = useCallback(
    (source: 'character' | 'asset') => {
      const urls = getStudioRefs(source).filter(Boolean);
      if (urls.length === 0) {
        setNotice(
          source === 'character'
            ? 'No references in Character Studio yet. Add refs there first, then try again.'
            : 'No references in Assets Studio yet. Add refs there first, then try again.'
        );
        return;
      }
      setNotice(null);
      setRefs((prev) => {
        const next = Array.from({ length: 14 }, (_, i) => prev[i] ?? '');
        for (const u of urls) {
          const idx = next.findIndex((x) => !x);
          if (idx < 0) break;
          next[idx] = u;
        }
        return next;
      });
    },
    [getStudioRefs]
  );

  const fillFromSelectedBeat = useCallback(() => {
    if (!selectedBeat) return;
    const linkedCast = productionCast.filter((c) =>
      selectedBeat.linkedVaultCharacterIds.includes(c.vaultCharacterId)
    );
    const linkedSupporting = productionSupportingRefs.filter((r) =>
      selectedBeat.linkedSupportingRefIds.includes(r.supportingRefId)
    );
    const linkedAssets = productionAssets.filter((a) =>
      selectedBeat.linkedVaultAssetIds.includes(a.vaultAssetId)
    );
    const packed = buildStorylineReferenceSlots(linkedCast, linkedSupporting, linkedAssets);
    setRefs(packed);
    setContext('character');
  }, [productionAssets, productionCast, productionSupportingRefs, selectedBeat]);

  const clearRefs = useCallback(() => {
    setRefs(Array.from({ length: 14 }, () => ''));
  }, []);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);
      setRefs((prev) => {
        const next = Array.from({ length: 14 }, (_, i) => prev[i] ?? '');
        let slot = 0;
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('image/')) continue;
          while (slot < 14 && next[slot]) slot++;
          if (slot >= 14) break;
          const url = URL.createObjectURL(file);
          next[slot] = url;
          slot++;
        }
        return next;
      });
    },
    []
  );

  const pasteFirstEmpty = useCallback(async () => {
    setError(null);
    try {
      const clipItems = await navigator.clipboard.read();
      setRefs((prev) => {
        const next = Array.from({ length: 14 }, (_, i) => prev[i] ?? '');
        for (const item of clipItems) {
          for (const type of item.types) {
            if (!type.startsWith('image/')) continue;
            void (async () => {
              const blob = await item.getType(type);
              const url = URL.createObjectURL(blob);
              const firstEmpty = next.findIndex((u) => !u);
              if (firstEmpty >= 0) next[firstEmpty] = url;
              setRefs([...next]);
            })();
            return next;
          }
        }
        return next;
      });
    } catch {
      setError('Could not paste image from clipboard (permission or no image).');
    }
  }, []);

  const refinePrompt = useCallback(async () => {
    const raw = promptRaw.trim();
    if (!raw) return;
    setAiBusy(true);
    setError(null);
    try {
      const res = await generateGeminiText({
        systemPrompt:
          'You are a prompt engineer for an image generation model. Rewrite the user prompt to be specific, concrete, and generation-ready. Output ONLY valid JSON: {"refinedPrompt":"..."}.\n\nNo markdown; no extra keys.',
        userPrompt:
          `User prompt:\n${raw}\n\n` +
          `Rewrite rules:\n` +
          `- Preserve the user's intent.\n` +
          `- Add concrete visual details (subject, scene, lighting, lens/composition cues).\n` +
          `- Keep it short (<= 2200 chars).\n`,
        jsonMode: true,
      });
      if (!res.ok) {
        setError(formatGeminiClientError(res.error));
        return;
      }
      const parsed = parseJsonFromModel<{ refinedPrompt?: string }>(res.text);
      const refined = (parsed?.refinedPrompt ?? '').trim();
      if (!refined) {
        setError('Could not refine prompt.');
        return;
      }
      setPromptRefined(refined);
      setUseRefinedPrompt(true);
    } finally {
      setAiBusy(false);
    }
  }, [promptRaw]);

  const generate = useCallback(async () => {
    const basePrompt = effectivePrompt;
    if (!basePrompt) {
      setError('Enter a prompt before generating.');
      return;
    }
    setError(null);
    setGenBusy(true);
    try {
      const seed = pickGenerationSeed('randomized', null);
      const res = await generateImage({
        prompt: basePrompt,
        referenceImageUrls: stableRefs,
        seed,
        aspectRatio,
        modelId,
        context,
      });
      if (!res.ok) {
        if ('blocked' in res && res.blocked) setError('Blocked by safety filters.');
        else if ('error' in res) setError(formatGeminiClientError(res.error));
        else setError('Failed to generate image.');
        return;
      }
      setLastImageUrl(res.imageDataUrl);
      setLastSeed(seed);
    } finally {
      setGenBusy(false);
    }
  }, [aspectRatio, context, effectivePrompt, modelId, stableRefs]);

  const downloadDataUrl = useCallback((dataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const canUseSelectedBeat = Boolean(selectedBeat && lastImageUrl);
  const labPreviewAspectCss = studioPreviewAspectCss(aspectRatio as StudioPreviewAspectId);
  const labPreviewMaxH = studioPreviewMaxHeightCss(aspectRatio as StudioPreviewAspectId);
  const isCinematic = aspectRatio === '21:9';
  const previewMaxH = isCinematic ? 'min(56vh, 520px)' : labPreviewMaxH;

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Image Lab</h3>

      <ImageshopImportPanel />

      <div className="mt-3 flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-5 min-h-0">
      <div className="flex-1 min-w-0 lg:max-w-[min(100%,440px)] space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
          onClick={() => replaceFromStudio('character')}
        >
          Replace with Character refs
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
          onClick={() => replaceFromStudio('asset')}
        >
          Replace with Asset refs
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
          onClick={() => addFromStudio('character')}
        >
          Add Character refs
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
          onClick={() => addFromStudio('asset')}
        >
          Add Asset refs
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10 disabled:opacity-40"
          disabled={!selectedBeat}
          onClick={() => fillFromSelectedBeat()}
        >
          Use selected beat refs
        </button>
      </div>
      {notice && (
        <p className="text-[11px] text-amber-200/90 border border-amber-500/30 bg-amber-950/20 rounded-lg px-2 py-1">
          {notice}
        </p>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="text-[10px] text-white/45 uppercase">References</label>
          <div className="flex gap-2">
            <label className="text-[10px] text-amber-200/90 hover:text-amber-100 cursor-pointer">
              Upload
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </label>
            <button
              type="button"
              className="text-[10px] text-white/70 hover:text-white/90"
              onClick={() => void pasteFirstEmpty()}
            >
              Paste
            </button>
            <button
              type="button"
              className="text-[10px] text-white/70 hover:text-white/90"
              onClick={() => clearRefs()}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {stableRefs.map((u, i) => (
            <div
              key={i}
              className={`relative w-14 h-14 rounded-lg border ${
                u ? 'border-fuchsia-400/30' : 'border-white/10'
              } bg-black/20 overflow-hidden`}
            >
              {u ? <ArcsStorageImg src={u} alt="" className="w-full h-full object-cover" /> : null}
              {u ? (
                <button
                  type="button"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/80 text-white text-xs flex items-center justify-center"
                  onClick={() => setRefs((prev) => prev.map((x, idx) => (idx === i ? '' : x)))}
                  aria-label="Remove reference"
                >
                  ×
                </button>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/25">
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[10px] text-white/45 uppercase mb-1">Prompt</label>
        <textarea
          className="w-full min-h-[72px] rounded-lg bg-black/30 border border-white/15 p-2 text-xs font-mono"
          value={promptRaw}
          onChange={(e) => setPromptRaw(e.target.value)}
          placeholder="Describe the image you want..."
        />

        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip content="Use Gemini to rewrite your prompt into a generation-ready prompt." side="top">
              <button
                type="button"
                disabled={aiBusy || !promptRaw.trim()}
                onClick={() => void refinePrompt()}
                className="px-2 py-1 rounded-lg text-[11px] border border-amber-500/40 hover:bg-amber-500/10 disabled:opacity-40"
              >
                {aiBusy ? 'Refining…' : 'AI prompt helper'}
              </button>
            </Tooltip>
            <button
              type="button"
              disabled={!promptRefined.trim()}
              onClick={() => setUseRefinedPrompt((v) => !v)}
              className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10 disabled:opacity-40"
            >
              {useRefinedPrompt ? 'Using refined prompt' : 'Using raw prompt'}
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-white/45 uppercase">Context</label>
            <div className="flex gap-2">
              {(['character', 'asset'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContext(c)}
                  className={`px-2 py-1 rounded-lg text-[11px] border ${
                    context === c ? 'border-fuchsia-400 bg-fuchsia-500/15' : 'border-white/15 bg-white/0'
                  }`}
                >
                  {c === 'character' ? 'Character' : 'Asset'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {promptRefined.trim() ? (
          <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/45 mb-1">
              Refined prompt preview
            </p>
            <p className="text-[11px] text-white/70 whitespace-pre-wrap">{promptRefined}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <label className="block text-[10px] text-white/45 uppercase mb-1">Aspect ratio</label>
        <div className="flex flex-wrap gap-2">
          {(['9:16', '1:1', '21:9'] as StoryBeatAspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setAspectRatio(ratio)}
              className={`px-2 py-1 rounded-lg text-[11px] border ${
                aspectRatio === ratio ? 'border-fuchsia-400 bg-fuchsia-500/15' : 'border-white/15 hover:bg-white/10'
              }`}
            >
              {ratio === '9:16'
                ? 'Portrait'
                : ratio === '1:1'
                  ? 'Square'
                  : 'Cinematic'}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-red-200/90">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={genBusy || !effectivePrompt}
          onClick={() => void generate()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold text-black disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, #D4AF37, #FBBF24)' }}
        >
          {genBusy ? 'Generating…' : 'Generate'}
        </button>

        <button
          type="button"
          disabled={!lastImageUrl}
          onClick={() => {
            if (!lastImageUrl) return;
            void navigator.clipboard.writeText(lastImageUrl);
          }}
          className="px-3 py-2 rounded-full text-xs border border-white/15 hover:bg-white/10 disabled:opacity-50"
        >
          Copy image data URL
        </button>

        <button
          type="button"
          disabled={!lastImageUrl}
          onClick={() => {
            if (!lastImageUrl) return;
            downloadDataUrl(lastImageUrl, 'image-lab.png');
          }}
          className="px-3 py-2 rounded-full text-xs border border-white/15 hover:bg-white/10 disabled:opacity-50"
        >
          Download PNG
        </button>
      </div>
      </div>

      <div className="flex-1 min-w-0 min-h-[200px] lg:min-h-0 flex flex-col">
        {lastImageUrl ? (
          <div className="flex flex-col h-full min-h-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2 shrink-0">Large preview</p>
            <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden flex-1 min-h-[220px] lg:min-h-[280px] flex items-center justify-center p-2">
              <div
                className="relative w-full max-w-full flex items-center justify-center overflow-hidden rounded-md border border-fuchsia-500/25 bg-black/40"
                style={{
                  aspectRatio: labPreviewAspectCss,
                  height: previewMaxH,
                  maxHeight: previewMaxH,
                  width: isCinematic ? '100%' : 'auto',
                  maxWidth: isCinematic ? 'min(100%, 980px)' : '100%',
                }}
              >
                <ArcsStorageImg src={lastImageUrl} alt="" className="h-full w-full object-contain object-center" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 shrink-0">
              {guidedPanelTarget?.currentStep === 'art' ? (
                <button
                  type="button"
                  disabled={!lastImageUrl}
                  onClick={sendBackToGuidedComicFlow}
                  className="px-3 py-2 rounded-full text-xs font-semibold text-black disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, #D4AF37, #FBBF24)' }}
                >
                  Send back to Guided Comic Flow
                </button>
              ) : null}
              <button
                type="button"
                disabled={!canUseSelectedBeat}
                onClick={() =>
                  selectedBeat &&
                  onUseAsSelectedBeat({
                    imageUrl: lastImageUrl,
                    seed: lastSeed,
                    aspectRatio,
                    visualPrompt: effectivePrompt,
                  })
                }
                className="px-3 py-2 rounded-full text-xs border border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                Use as selected beat image
              </button>
              <button
                type="button"
                disabled={!lastImageUrl}
                onClick={() =>
                  onCreateNewBeat({
                    imageUrl: lastImageUrl,
                    seed: lastSeed,
                    aspectRatio,
                    visualPrompt: effectivePrompt,
                  })
                }
                className="px-3 py-2 rounded-full text-xs border border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                Create new B-roll beat
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[180px] rounded-lg border border-dashed border-white/15 bg-black/15 flex flex-col items-center justify-center text-center px-4">
            <p className="text-[11px] text-white/40">
              Generated image appears here (portrait / square / cinematic).
            </p>
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
