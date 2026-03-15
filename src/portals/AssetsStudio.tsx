import React, { useEffect, useState } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { HybridTagBar } from '@/components/HybridTagBar';
import { CopyButton } from '@/shared/components/CopyButton';
import { Tooltip } from '@/shared/components/Tooltip';
import { useAssetStudioStore } from '@/stores/assetStudioStore';
import { buildAssetStudioPrompt } from '@/shared/utils/assetStudioPrompt';
import {
  ASSET_STUDIO_BG,
  ACCENT_GOLD_GRADIENT,
  ASSET_STUDIO_AMETHYST_TEXT,
  GEM_AMETHYST,
} from '@/shared/theme/Phase12DesignTokens';
import {
  ART_STYLE_FLAGSHIP,
  ART_STYLE_LIBRARY,
  ERA_STYLE_TAGS,
  LOCATION_TYPE_TAGS,
  ARCHITECTURAL_DETAIL_TAGS,
  SET_DRESSING_PRESETS,
  CINEMATIC_OPTIONS,
  SPATIAL_ROOM_OPTIONS,
  SPATIAL_URBAN_OPTIONS,
  TIME_SEASON_OPTIONS,
  SPATIAL_GALLERY_CAMERA_ANGLE_OPTIONS,
  type SetDressingCategory,
  type AssetCinematicKey,
  type AspectRatioId,
} from '@/data/asset_studio_spec';
import { saveGeneration } from '@/shared/utils/generationOutputRouter';
import { getStoryPhotoCollections, addCharacterRefToStory } from '@/shared/utils/storyPhotoCollections';
import { generateImage } from '@/shared/api/geminiImageApi';
import { saveAssetToDb } from '@/shared/api/arcsPersistence';
import { addCachedGeneration, getCachedGenerations } from '@/shared/utils/generationSessionCache';

const goldTextStyle: React.CSSProperties = {
  background: ACCENT_GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

const chipInactive =
  'bg-white/5 border border-white/20 hover:border-amber-500/50';

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 border ${active ? 'text-black hover:text-violet-300 border-amber-600/80 shadow-[0_0_10px_rgba(191,149,63,0.4)]' : chipInactive}`}
      style={active ? { background: ACCENT_GOLD_GRADIENT } : undefined}
    >
      {active ? (
        label
      ) : (
        <span className="inline-block" style={goldTextStyle}>
          {label}
        </span>
      )}
    </button>
  );
}

function MultiChip({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          active={selected.includes(opt)}
          onClick={() => onToggle(opt)}
        />
      ))}
    </div>
  );
}

/** Single category dropdown (Era/Style, Location Type, Architectural Detail) + input + Save as Tag */
function SceneSettingCategoryAdd({
  onSave,
}: {
  onSave: (categoryId: string, value: string) => void;
}) {
  const [categoryId, setCategoryId] = useState<'eraStyle' | 'locationType' | 'architecturalDetail'>('architecturalDetail');
  const [input, setInput] = useState('');
  const handleSave = () => {
    if (input.trim()) {
      onSave(categoryId, input.trim());
      setInput('');
    }
  };
  return (
    <div className="flex gap-2 mt-2 flex-wrap items-center">
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value as 'eraStyle' | 'locationType' | 'architecturalDetail')}
        className="bg-black/40 text-white border border-white/20 rounded px-2 py-1.5 text-xs min-w-0 flex-1 basis-24"
      >
        <option value="eraStyle">Era / Style</option>
        <option value="locationType">Location Type</option>
        <option value="architecturalDetail">Architectural Detail</option>
      </select>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Custom tag..."
        className="flex-1 min-w-0 bg-black/40 text-white placeholder-white/40 px-2 py-1.5 rounded text-xs border border-white/10"
      />
      <button
        type="button"
        onClick={handleSave}
        className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        Save as Tag
      </button>
    </div>
  );
}

function SectionAddToLibrary({
  categories,
  onSave,
}: {
  categories: { id: string; label: string }[];
  onSave: (categoryId: string, value: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [input, setInput] = useState('');
  const handleSave = () => {
    if (input.trim() && categoryId) {
      onSave(categoryId, input.trim());
      setInput('');
    }
  };
  return (
    <div className="flex gap-2 mt-2 flex-wrap items-center">
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="bg-black/40 text-white border border-white/20 rounded px-2 py-1.5 text-xs min-w-0 flex-1 basis-24"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Add custom..."
        className="flex-1 min-w-0 bg-black/40 text-white placeholder-white/40 px-2 py-1.5 rounded text-xs border border-white/10"
      />
      <button
        type="button"
        onClick={handleSave}
        className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        Save as Tag
      </button>
    </div>
  );
}

function SetDressingRow({
  category,
  presets,
  selected,
  library,
  onToggle,
}: {
  category: SetDressingCategory;
  presets: readonly string[];
  selected: string[];
  library: string[];
  onToggle: (v: string) => void;
}) {
  const allOptions = [...presets, ...library];
  const label = category.replace(/([A-Z])/g, ' $1').trim();
  return (
    <div>
      <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>{label}</h3>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            active={selected.includes(opt)}
            onClick={() => onToggle(opt)}
          />
        ))}
      </div>
    </div>
  );
}

export const AssetsStudio: React.FC = () => {
  const { setTheme } = useTheme();
  const store = useAssetStudioStore();
  const [vaultPassword, setVaultPassword] = useState('');
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [statusStep, setStatusStep] = useState(0);

  const STATUS_BREADCRUMBS = [
    'Scanning DNA/Architecture...',
    'Contacting Onyx Vault...',
    'Crystallizing Render...',
  ];

  useEffect(() => {
    setTheme('purple');
  }, [setTheme]);

  useEffect(() => {
    if (store.generationStatus !== 'pending') return;
    const id = setInterval(() => {
      setStatusStep((s) => (s + 1) % STATUS_BREADCRUMBS.length);
    }, 2500);
    return () => clearInterval(id);
  }, [store.generationStatus]);

  const hasReferenceImage = !!store.currentLiveImageUrl;
  const settingAndLocationDisabled =
    (hasReferenceImage && !store.diversifyStyle) || store.architecturalLock;

  const extraParts: string[] = [
    store.artStyleId === 'flagship' ? ART_STYLE_FLAGSHIP : store.artStyleId,
    ...(settingAndLocationDisabled ? [] : store.eraStyleSelection),
    ...(settingAndLocationDisabled ? [] : store.locationTypeSelection),
    ...(settingAndLocationDisabled ? [] : store.architecturalDetailSelection),
    ...(settingAndLocationDisabled ? [] : Object.values(store.setDressingSelections).flat()),
    ...Object.values(store.cinematic).filter(Boolean),
    ...(store.spatialRoomOption ? [store.spatialRoomOption] : []),
    ...(store.spatialUrbanOption ? [store.spatialUrbanOption] : []),
    ...(store.timeSeason ? [store.timeSeason] : []),
    ...(store.aspectRatio ? [`aspect ratio ${store.aspectRatio}`] : []),
  ].filter(Boolean);

  const compiledPrompt =
    store.vaultUnlocked && store.vaultPromptOverride.trim()
      ? store.vaultPromptOverride
      : buildAssetStudioPrompt(store.tags, '', extraParts);
  const displayPrompt =
    store.currentGenerationSeed != null
      ? `${compiledPrompt}\n\nUse seed: ${store.currentGenerationSeed} for consistency with the reference image.`
      : compiledPrompt;

  const stories = getStoryPhotoCollections();
  const hasStories = stories.length > 0;

  const handleGenerateAsset = async () => {
    store.setGenerationStatus('pending');
    const seed = store.currentGenerationSeed ?? Math.floor(Math.random() * 0xFFFFFFFF);
    store.setCurrentGenerationSeed(seed);
    const refUrls = store.referenceImageUrls.length > 0
      ? store.referenceImageUrls
      : store.currentLiveImageUrl
        ? [store.currentLiveImageUrl]
        : [];
    const result = await generateImage({
      prompt: compiledPrompt,
      referenceImageUrls: refUrls,
      seed,
      aspectRatio: store.aspectRatio,
      modelId: store.selectedOnyxModelId,
    });
    if (result.ok) {
      store.setCurrentLiveImageUrl(result.imageDataUrl);
      store.setCurrentGenerationSeed(seed);
      store.setGenerationStatus('idle');
      addCachedGeneration('asset', { url: result.imageDataUrl, seed });
    } else if ('blocked' in result && result.blocked) {
      store.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
    } else if ('error' in result) {
      store.setGenerationStatus('error', result.error);
    }
  };

  const handleSaveNewAsset = async () => {
    const url = store.currentLiveImageUrl;
    if (!url) return;
    saveGeneration('asset', url, store.currentGenerationSeed ?? undefined);
    addCachedGeneration('asset', { url, seed: store.currentGenerationSeed ?? undefined });
    const result = await saveAssetToDb(store);
    if (!result.ok && result.error && result.error !== 'Supabase not configured') {
      store.setGenerationStatus('error', result.error);
    }
  };

  const handleExpandSetting = async () => {
    const primarySeed = store.currentGenerationSeed ?? Math.floor(Math.random() * 0xFFFFFFFF);
    const expansionSeed = primarySeed + 1;
    store.setGenerationStatus('pending');
    const refUrls = store.referenceImageUrls.length > 0
      ? store.referenceImageUrls
      : store.currentLiveImageUrl
        ? [store.currentLiveImageUrl]
        : [];
    const expansionParts = [
      store.spatialRoomOption,
      store.spatialUrbanOption,
      store.timeSeason,
    ].filter(Boolean);
    const expansionPrompt = expansionParts.length > 0
      ? `${compiledPrompt}, spatial expansion: ${expansionParts.join(', ')}`
      : compiledPrompt;
    const result = await generateImage({
      prompt: expansionPrompt,
      referenceImageUrls: refUrls,
      seed: expansionSeed,
      aspectRatio: store.aspectRatio,
      modelId: store.selectedOnyxModelId,
    });
    if (result.ok) {
      store.setCurrentLiveImageUrl(result.imageDataUrl);
      store.setCurrentGenerationSeed(expansionSeed);
      store.setGenerationStatus('idle');
      addCachedGeneration('asset', { url: result.imageDataUrl, seed: expansionSeed });
    } else if ('blocked' in result && result.blocked) {
      store.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
    } else if ('error' in result) {
      store.setGenerationStatus('error', result.error);
    }
  };

  const handleAddToLibrary = () => {
    const url = store.currentLiveImageUrl;
    if (url) saveGeneration('asset', url, store.currentGenerationSeed ?? undefined);
  };

  const handleCastInStory = (storyId: string) => {
    const url = store.currentLiveImageUrl;
    if (url) addCharacterRefToStory(storyId, url);
  };

  const toggleEra = (value: string) => {
    const next = store.eraStyleSelection.includes(value)
      ? store.eraStyleSelection.filter((v) => v !== value)
      : [...store.eraStyleSelection, value];
    store.setEraStyleSelection(next);
  };

  const toggleLocation = (value: string) => {
    const next = store.locationTypeSelection.includes(value)
      ? store.locationTypeSelection.filter((v) => v !== value)
      : [...store.locationTypeSelection, value];
    store.setLocationTypeSelection(next);
  };

  const toggleArchitectural = (value: string) => {
    const next = store.architecturalDetailSelection.includes(value)
      ? store.architecturalDetailSelection.filter((v) => v !== value)
      : [...store.architecturalDetailSelection, value];
    store.setArchitecturalDetailSelection(next);
  };

  const toggleSetDressing = (category: SetDressingCategory, value: string) => {
    const current = store.setDressingSelections[category] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    store.setSetDressingSelection(category, next);
  };

  return (
    <div
      className="flex flex-col min-h-screen p-4 animate-fade-in"
      style={{ background: ASSET_STUDIO_BG }}
    >
      <header
        className="flex-shrink-0 flex items-center justify-center w-full mb-3 rounded-lg px-4 py-2"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        <h1
          className="text-center text-2xl font-black text-transparent bg-clip-text tracking-tight truncate min-w-0"
          style={{ background: ASSET_STUDIO_AMETHYST_TEXT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          ASSET REFERENCE STUDIO
        </h1>
      </header>

      <div className="flex gap-3 w-full flex-1 min-h-0">
        {/* Left Panel: Import at top, then scroll */}
        <div className="flex-[0_0_34%] min-w-0 h-[calc(85vh+100px)] flex flex-col rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden flex-shrink-0">
          <div className="flex-shrink-0 p-2 border-b border-white/10">
            <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-2" style={goldTextStyle}>
              Import Asset / Setting
            </h2>
            <Tooltip
              content="Upload reference images. Up to 14 for the API. By default the AI treats them as absolute architectural reference; enable Diversify Style to use tags for era and materials."
              side="bottom"
            >
              <label className="flex rounded-xl border border-dashed border-amber-500/40 bg-black/30 px-3 py-2.5 cursor-pointer hover:border-amber-500/60 transition-colors">
                <span className="text-xs font-medium inline-block" style={goldTextStyle}>Add reference ({store.referenceImageUrls.length}/14)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && store.referenceImageUrls.length < 14) {
                      const url = URL.createObjectURL(file);
                      store.addReferenceImage(url);
                      store.setCurrentLiveImageUrl(url);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </Tooltip>
            {store.referenceImageUrls.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {store.referenceImageUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-10 h-10 rounded object-cover border border-amber-500/30" />
                    <button
                      type="button"
                      onClick={() => {
                        store.removeReferenceImage(i);
                        if (store.currentLiveImageUrl === url) {
                          const next = store.referenceImageUrls.filter((_, j) => j !== i);
                          store.setCurrentLiveImageUrl(next[0] ?? null);
                        }
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {hasReferenceImage && (
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={store.diversifyStyle}
                  onChange={(e) => store.setDiversifyStyle(e.target.checked)}
                  className="rounded border-amber-500/50"
                />
                <span className="text-xs inline-block" style={goldTextStyle}>Diversify Style</span>
              </label>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Art Style Engine */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Art Style
              </h2>
              <div className="space-y-2">
                <Chip
                  label={ART_STYLE_FLAGSHIP}
                  active={store.artStyleId === 'flagship'}
                  onClick={() => store.setArtStyle('flagship')}
                />
                <div className="flex flex-wrap gap-2">
                  {ART_STYLE_LIBRARY.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={store.artStyleId === opt}
                      onClick={() =>
                        store.setArtStyle(store.artStyleId === opt ? 'flagship' : opt)
                      }
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customStyleInput}
                    onChange={(e) => setCustomStyleInput(e.target.value)}
                    placeholder="Custom style..."
                    className="flex-1 bg-black/40 text-white placeholder-white/40 px-3 py-2 rounded-lg border border-white/10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customStyleInput.trim()) {
                        store.addCustomStyle(customStyleInput.trim());
                        store.setTags([
                          ...store.tags,
                          {
                            id: crypto.randomUUID(),
                            text: customStyleInput.trim().replace(/\s+/g, '-').toLowerCase(),
                            polarity: 'positive',
                          },
                        ]);
                        setCustomStyleInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50"
                    style={{ background: ACCENT_GOLD_GRADIENT }}
                  >
                    Save as Tag
                  </button>
                </div>
              </div>
            </section>

            {/* Era / Style */}
            <section
              className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={settingAndLocationDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Era / Style
              </h2>
              {settingAndLocationDisabled && (
                <p className="text-xs text-white/60 mb-2">
                  {store.architecturalLock
                    ? 'Architectural Lock is on. Turn off to edit setting/location tags.'
                    : 'Uploaded image is absolute reference. Enable "Diversify Style" to use tags.'}
                </p>
              )}
              <MultiChip
                options={[...ERA_STYLE_TAGS, ...store.eraStyleLibrary]}
                selected={store.eraStyleSelection}
                onToggle={toggleEra}
              />
            </section>

            {/* Location Type */}
            <section
              className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={settingAndLocationDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Location Type
              </h2>
              <MultiChip
                options={[...LOCATION_TYPE_TAGS, ...store.locationTypeLibrary]}
                selected={store.locationTypeSelection}
                onToggle={toggleLocation}
              />
            </section>

            {/* Architectural Detail */}
            <section
              className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={settingAndLocationDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Architectural Detail
              </h2>
              <MultiChip
                options={[...ARCHITECTURAL_DETAIL_TAGS, ...store.architecturalDetailLibrary]}
                selected={store.architecturalDetailSelection}
                onToggle={toggleArchitectural}
              />
              <SceneSettingCategoryAdd
                onSave={(categoryId, value) => {
                  const trimmed = value.trim();
                  if (!trimmed) return;
                  const slug = trimmed.replace(/\s+/g, '-').toLowerCase();
                  store.setTags([
                    ...store.tags,
                    { id: crypto.randomUUID(), text: slug, polarity: 'positive' },
                  ]);
                  if (categoryId === 'eraStyle') {
                    store.addEraStyleOption(trimmed);
                    store.setEraStyleSelection([...store.eraStyleSelection, trimmed]);
                  } else if (categoryId === 'locationType') {
                    store.addLocationTypeOption(trimmed);
                    store.setLocationTypeSelection([...store.locationTypeSelection, trimmed]);
                  } else {
                    store.addArchitecturalDetailOption(trimmed);
                    store.setArchitecturalDetailSelection([...store.architecturalDetailSelection, trimmed]);
                  }
                }}
              />
            </section>

            {/* Scene Setting & Props */}
            <section
              className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={settingAndLocationDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Scene Setting & Props
              </h2>
              <div className="space-y-4">
                {(Object.keys(SET_DRESSING_PRESETS) as SetDressingCategory[]).map((cat) => (
                  <SetDressingRow
                    key={cat}
                    category={cat}
                    presets={SET_DRESSING_PRESETS[cat]}
                    selected={store.setDressingSelections[cat] ?? []}
                    library={store.setDressingLibraries[cat] ?? []}
                    onToggle={(v) => toggleSetDressing(cat, v)}
                  />
                ))}
              </div>
              <SectionAddToLibrary
                categories={(Object.keys(SET_DRESSING_PRESETS) as SetDressingCategory[]).map((c) => ({
                  id: c,
                  label: c.replace(/([A-Z])/g, ' $1').trim(),
                }))}
                onSave={(cat, v) => store.addSetDressingOption(cat as SetDressingCategory, v)}
              />
            </section>

            {/* Cinematic Suite */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Cinematic Suite
              </h2>
              <div className="space-y-4">
                {(Object.keys(CINEMATIC_OPTIONS) as AssetCinematicKey[]).map((key) => (
                  <div key={key}>
                    <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>{key}</h3>
                    <div className="flex flex-wrap gap-2">
                      {[...CINEMATIC_OPTIONS[key], ...(store.cinematicLibraries[key] ?? [])].map((opt) => (
                        <Chip
                          key={opt}
                          label={opt}
                          active={(store.cinematic[key] || '') === opt}
                          onClick={() => store.setCinematic(key, opt)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <SectionAddToLibrary
                  categories={(Object.keys(CINEMATIC_OPTIONS) as AssetCinematicKey[]).map((k) => ({ id: k, label: k }))}
                  onSave={(cat, v) => store.addCinematicOption(cat as AssetCinematicKey, v)}
                />
              </div>
            </section>

            {/* Onyx Vault */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                The Onyx Vault
              </h2>
              {!store.vaultUnlocked ? (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Password"
                    className="flex-1 bg-black/40 text-white placeholder-white/40 px-3 py-2 rounded-lg border border-white/10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => store.unlockVault(vaultPassword)}
                    className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50 min-w-[72px]"
                    style={{ background: ACCENT_GOLD_GRADIENT }}
                  >
                    Unlock
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium inline-block mb-1.5" style={goldTextStyle}>Model</span>
                    <select
                      value={store.selectedOnyxModelId}
                      onChange={(e) => store.setSelectedOnyxModelId(e.target.value as 'flash' | 'pro')}
                      className="w-full bg-black/60 text-white border border-amber-500/20 rounded-lg px-3 py-2 text-xs"
                    >
                      <option value="flash">Nano Banana 2 (Speed)</option>
                      <option value="pro">Nano Banana Pro (Detail)</option>
                    </select>
                  </div>
                  <textarea
                    value={store.vaultPromptOverride}
                    onChange={(e) => store.setVaultPromptOverride(e.target.value)}
                    placeholder="Edit prompt..."
                    className="w-full h-28 bg-black/60 text-white/90 p-3 rounded-lg border border-amber-500/20 text-xs font-mono resize-y"
                  />
                </div>
              )}
            </section>

            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Prompt Tags
              </h2>
              <HybridTagBar tags={store.tags} setTags={store.setTags} variant="amethyst" />
            </section>
          </div>
        </div>

        {/* Center: Live Prompt + Live Generation + footer pills */}
        <div className="flex-1 flex gap-3 min-w-0 min-h-0 max-h-[calc(85vh+100px)] overflow-hidden">
          <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
            <div className="flex-shrink-0 rounded-xl border border-white/10 bg-black/30 p-3 min-h-[480px] flex flex-col">
              <h2 className="text-base font-bold mb-1.5 uppercase tracking-widest" style={goldTextStyle}>
                Live Prompt
              </h2>
              <div className="bg-black/60 p-2 rounded-lg font-mono text-[10px] text-violet-100/80 break-words flex-1 min-h-[420px] overflow-y-auto custom-scrollbar">
                {displayPrompt || '// Prompt is empty...'}
              </div>
              <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                <CopyButton text={displayPrompt} labelStyle={goldTextStyle} />
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-full border border-amber-500/30 bg-black/20 hover:border-amber-500/60 transition-all group ml-auto">
                  <span className="text-xs font-bold tracking-widest inline-block" style={goldTextStyle}>
                    Architectural Lock
                  </span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => store.setArchitecturalLock(!store.architecturalLock)}
                    onKeyDown={(e) => e.key === 'Enter' && store.setArchitecturalLock(!store.architecturalLock)}
                    className="w-10 h-5 rounded-full p-0.5 transition-colors duration-300 bg-white/10"
                    style={store.architecturalLock ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
                        store.architecturalLock ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>

            <div
              className="flex-shrink-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 min-h-[2.5rem] flex items-center"
              data-status={store.generationStatus === 'pending' ? STATUS_BREADCRUMBS[statusStep].replace(/\s+/g, '-').toLowerCase() : undefined}
            >
              <span className="text-xs font-mono" style={goldTextStyle}>
                {store.generationStatus === 'safety_blocked'
                  ? 'Prompt restricted by safety filters. Please adjust and try again'
                  : store.generationStatus === 'error' && store.generationStatusMessage
                    ? store.generationStatusMessage
                    : store.generationStatus === 'pending'
                      ? STATUS_BREADCRUMBS[statusStep]
                      : '\u00A0'}
              </span>
            </div>

            <div className="flex-1 min-h-[280px] rounded-2xl border border-white/10 bg-black/40 flex flex-col overflow-hidden flex-shrink-0">
              <h2 className="text-base font-bold uppercase tracking-widest px-4 pt-3 pb-1 flex-shrink-0" style={goldTextStyle}>
                Live Generation / Vault
              </h2>
              {getCachedGenerations('asset').length > 0 && (
                <div className="flex-shrink-0 px-2 pb-2 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] uppercase tracking-wider text-white/60">Recent</span>
                  {getCachedGenerations('asset').map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        store.setCurrentLiveImageUrl(item.url);
                        if (item.seed != null) store.setCurrentGenerationSeed(item.seed);
                      }}
                      className="flex-shrink-0 w-12 h-12 rounded border border-amber-500/30 overflow-hidden hover:border-amber-500/60"
                    >
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-[100px]">
                {store.currentLiveImageUrl ? (
                  <img
                    src={store.currentLiveImageUrl}
                    alt="Live asset"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full border border-amber-500/30 mx-auto flex items-center justify-center bg-black/40">
                      <span className="text-2xl">🌍</span>
                    </div>
                    <p className="font-mono text-sm inline-block" style={goldTextStyle}>
                      {store.architecturalLock ? 'ARCH LOCKED' : 'Live Asset'}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 p-3 border-t border-white/10 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleGenerateAsset}
                  disabled={store.generationStatus === 'pending'}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-black border border-amber-600/50 hover:text-violet-300 transition-colors disabled:opacity-90 disabled:cursor-wait"
                  style={
                    store.generationStatus === 'pending'
                      ? { background: GEM_AMETHYST, boxShadow: `0 0 16px ${GEM_AMETHYST}` }
                      : { background: ACCENT_GOLD_GRADIENT }
                  }
                >
                  {store.generationStatus === 'pending' ? (
                    <span
                      className="inline-block w-4 h-4 rounded-sm rotate-45 animate-pulse"
                      style={{ background: GEM_AMETHYST, boxShadow: `0 0 10px ${GEM_AMETHYST}` }}
                      aria-label="Generating..."
                    />
                  ) : (
                    'Generate Asset'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewAsset}
                  disabled={!store.currentLiveImageUrl}
                  className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-block" style={goldTextStyle}>Save New Asset</span>
                </button>
                <button
                  type="button"
                  onClick={handleExpandSetting}
                  className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs"
                >
                  <span className="inline-block" style={goldTextStyle}>Expand Setting</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddToLibrary}
                  disabled={!store.currentLiveImageUrl}
                  className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-block" style={goldTextStyle}>Add to Library</span>
                </button>
                {hasStories ? (
                  <CastInStoryButton
                    stories={stories}
                    onSelect={handleCastInStory}
                    disabled={!store.currentLiveImageUrl}
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-full border border-white/20 font-medium text-xs cursor-not-allowed opacity-60"
                  >
                    <span className="inline-block" style={goldTextStyle}>Cast in Story</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Spatial Expansion Gallery */}
          <div className="flex-[0_0_28%] min-w-0 min-h-0 flex flex-col rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-2" style={goldTextStyle}>
                Spatial Expansion Gallery
              </h2>

              <div>
                <label className="text-xs block mb-2 inline-block" style={goldTextStyle}>Room Expansion</label>
                <div className="flex flex-wrap gap-2">
                  {SPATIAL_ROOM_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={store.spatialRoomOption === opt}
                      onClick={() => store.setSpatialRoomOption(store.spatialRoomOption === opt ? null : opt)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs block mb-2 inline-block" style={goldTextStyle}>Urban Expansion</label>
                <div className="flex flex-wrap gap-2">
                  {SPATIAL_URBAN_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={store.spatialUrbanOption === opt}
                      onClick={() => store.setSpatialUrbanOption(store.spatialUrbanOption === opt ? null : opt)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs block mb-2 inline-block" style={goldTextStyle}>Time / Season</label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SEASON_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={store.timeSeason === opt}
                      onClick={() => store.setTimeSeason(store.timeSeason === opt ? null : opt)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs block mb-2 inline-block" style={goldTextStyle}>Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                  {(['9:16', '1:1', '21:9'] as AspectRatioId[]).map((ratio) => (
                    <Chip
                      key={ratio}
                      label={ratio === '9:16' ? 'Portrait (9:16)' : ratio === '21:9' ? 'Cinematic (21:9)' : 'Square (1:1)'}
                      active={store.aspectRatio === ratio}
                      onClick={() => store.setAspectRatio(ratio)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs block mb-2 inline-block" style={goldTextStyle}>Camera Angle</label>
                <div className="flex flex-wrap gap-2">
                  {SPATIAL_GALLERY_CAMERA_ANGLE_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={(store.cinematic.angle || '') === opt}
                      onClick={() => store.setCinematic('angle', opt)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function CastInStoryButton({
  stories,
  onSelect,
  disabled,
}: {
  stories: { id: string; name?: string }[];
  onSelect: (storyId: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="inline-block" style={goldTextStyle}>Cast in Story</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-violet-900/95 border border-amber-500/30 rounded-xl p-4 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold text-violet-100 mb-3">
              Add asset to story
            </h3>
            <ul className="space-y-2 mb-4">
              {stories.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(s.id);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border border-white/10 hover:bg-amber-500/20 text-white"
                  >
                    {s.name || s.id}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-lg border border-white/20 text-white/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
