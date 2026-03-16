import React, { useEffect, useState } from 'react';
import { Expand, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from '@/shared/context/ThemeContext';
import { HybridTagBar } from '@/components/HybridTagBar';
import { CopyButton } from '@/shared/components/CopyButton';
import { Tooltip } from '@/shared/components/Tooltip';
import {
  useCharacterStudioStore,
  type WardrobeModifierCategory,
} from '@/stores/characterStudioStore';
import { buildCharacterStudioPrompt } from '@/shared/utils/characterStudioPrompt';
import {
  CHARACTER_STUDIO_BG_V4,
  ACCENT_GOLD_GRADIENT,
  CHARACTER_STUDIO_EMERALD_TEXT,
  GEM_EMERALD,
} from '@/shared/theme/Phase12DesignTokens';
import { getSlotLabel } from '@/shared/constants/referenceSlots';
import {
  ART_STYLE_FLAGSHIP,
  ART_STYLE_LIBRARY,
  HERITAGE_TAGS,
  GENDER_TAGS,
  SURGICAL_PHYSICAL,
  WARDROBE_PRESETS,
  CINEMATIC_OPTIONS,
  type WardrobeCategory,
  type SurgicalPhysicalKey,
  type CinematicKey,
  type AspectRatioId,
} from '@/data/character_studio_spec';
import { saveGeneration } from '@/shared/utils/generationOutputRouter';
import { getStoryPhotoCollections, addCharacterRefToStory } from '@/shared/utils/storyPhotoCollections';
import { generateImage } from '@/shared/api/geminiImageApi';
import { saveCharacterToDb } from '@/shared/api/arcsPersistence';
import { addCachedGeneration, getCachedGenerations } from '@/shared/utils/generationSessionCache';
import { ModifierRibbon } from '@/components/ui/ModifierRibbon';
import { ArchiveRecallModal } from '@/components/ui/ArchiveRecallModal';

/** Gradient gold text (match Comics Studio); use with style for background. */
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
      className={`group px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 border ${active ? 'text-black hover:text-emerald-400 border-amber-600/80 shadow-[0_0_10px_rgba(191,149,63,0.4)]' : chipInactive}`}
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

/** One dropdown (category) + input + Save as Tag per section */
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

export const CharacterStudio: React.FC = () => {
  const { setTheme } = useTheme();
  const store = useCharacterStudioStore();
  const [vaultPassword, setVaultPassword] = useState('');
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [statusStep, setStatusStep] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [recallSlotIndex, setRecallSlotIndex] = useState<number | null>(null);
  const [showSaveCharacterModal, setShowSaveCharacterModal] = useState(false);
  const [saveCharacterProfileName, setSaveCharacterProfileName] = useState('');
  const [saveCharacterCastName, setSaveCharacterCastName] = useState('');
  const [saveCharacterIsEditProfile, setSaveCharacterIsEditProfile] = useState(false);

  const STATUS_BREADCRUMBS = [
    'Scanning DNA/Architecture...',
    'Contacting Onyx Vault...',
    'Crystallizing Render...',
  ];

  useEffect(() => {
    setTheme('teal');
  }, [setTheme]);

  useEffect(() => {
    if (store.generationStatus !== 'pending') return;
    const id = setInterval(() => {
      setStatusStep((s) => (s + 1) % STATUS_BREADCRUMBS.length);
    }, 2500);
    return () => clearInterval(id);
  }, [store.generationStatus]);

  const dna = {
    heritage: store.heritageSelection,
    gender: store.genderSelection,
  };
  const artStyleLabel =
    store.artStyleId === 'flagship'
      ? ART_STYLE_FLAGSHIP
      : store.artStyleId;
  const hasReferenceImage = !!store.currentLiveImageUrl;
  const dnaAndPhysicalDisabled = hasReferenceImage && !store.diversifyLikeness;

  const extraParts: string[] = [
    artStyleLabel,
    ...(dnaAndPhysicalDisabled ? [] : store.heritageSelection),
    ...(dnaAndPhysicalDisabled ? [] : store.genderSelection),
    ...(dnaAndPhysicalDisabled ? [] : Object.values(store.physicalSelections).flat()),
    ...Object.values(store.wardrobeSelections).flat(),
    ...Object.values(store.cinematic).filter(Boolean),
  ].filter(Boolean);
  const compiledPrompt =
    store.vaultUnlocked && store.vaultPromptOverride.trim()
      ? store.vaultPromptOverride
      : buildCharacterStudioPrompt(store.tags, '', dna, extraParts, {
          appendOfficialRules: true,
          wardrobeModifiers: store.wardrobeModifiers,
          wardrobeSelections: store.wardrobeSelections,
        });
  const displayPrompt =
    store.currentGenerationSeed != null
      ? `${compiledPrompt}\n\nUse seed: ${store.currentGenerationSeed} for consistency with the reference image.`
      : compiledPrompt;

  const stories = getStoryPhotoCollections();
  const hasStories = stories.length > 0;

  const handleGenerateCharacter = async () => {
    store.setGenerationStatus('pending');
    const seed = store.currentGenerationSeed ?? Math.floor(Math.random() * 0xFFFFFFFF);
    store.setCurrentGenerationSeed(seed);
    const refUrls = store.referenceImageUrls.length > 0
      ? store.referenceImageUrls
      : store.currentLiveImageUrl
        ? [store.currentLiveImageUrl]
        : [];
    const promptForApi =
      refUrls.length > 0
        ? `Apply this art style to the entire image, including the subject (face, skin, hair, body). Do not keep the subject photorealistic—reinterpret the reference in the chosen style so the subject looks like a ${artStyleLabel}, not a photograph. Art style: ${artStyleLabel}. ${compiledPrompt}`
        : compiledPrompt;
    const result = await generateImage({
      prompt: promptForApi,
      referenceImageUrls: refUrls,
      seed,
      aspectRatio: '9:16',
      modelId: store.selectedOnyxModelId,
    });
    if (result.ok) {
      store.setCurrentLiveImageUrl(result.imageDataUrl);
      store.setCurrentGenerationSeed(seed);
      store.setGenerationStatus('idle');
      addCachedGeneration('character', { url: result.imageDataUrl, seed });
    } else if ('blocked' in result && result.blocked) {
      store.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
    } else if ('error' in result) {
      store.setGenerationStatus('error', result.error);
    }
  };

  const handleGenerateAlternate = async () => {
    store.setGenerationStatus('pending');
    const seed = store.currentGenerationSeed ?? Math.floor(Math.random() * 0xFFFFFFFF);
    store.setCurrentGenerationSeed(seed);
    const refUrls = store.referenceImageUrls.length > 0
      ? store.referenceImageUrls
      : store.currentLiveImageUrl
        ? [store.currentLiveImageUrl]
        : [];
    const basePrompt =
      refUrls.length > 0
        ? `Apply this art style to the entire image, including the subject (face, skin, hair, body). Do not keep the subject photorealistic—reinterpret the reference in the chosen style so the subject looks like a ${artStyleLabel}, not a photograph. Art style: ${artStyleLabel}. ${compiledPrompt}`
        : compiledPrompt;
    const promptForApi = `${basePrompt} Alternate pose, same character.`;
    const result = await generateImage({
      prompt: promptForApi,
      referenceImageUrls: refUrls,
      seed,
      aspectRatio: '9:16',
      modelId: store.selectedOnyxModelId,
    });
    if (result.ok) {
      store.setCurrentLiveImageUrl(result.imageDataUrl);
      store.setCurrentGenerationSeed(seed);
      store.setGenerationStatus('idle');
      addCachedGeneration('character', { url: result.imageDataUrl, seed });
    } else if ('blocked' in result && result.blocked) {
      store.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
    } else if ('error' in result) {
      store.setGenerationStatus('error', result.error);
    }
  };

  const openSaveCharacterModal = (isEditProfile: boolean) => {
    setSaveCharacterProfileName('');
    setSaveCharacterCastName('');
    setSaveCharacterIsEditProfile(isEditProfile);
    setShowSaveCharacterModal(true);
  };

  const handleSaveCharacterModalConfirm = async () => {
    const profileName = saveCharacterProfileName.trim();
    if (!profileName) return;
    const url = store.currentLiveImageUrl;
    if (!url) return;
    const castName = saveCharacterCastName.trim() || undefined;
    if (saveCharacterIsEditProfile && store.selectedPoseId) {
      store.updatePose(store.selectedPoseId, { imageUrl: url });
    }
    saveGeneration('character', url, store.currentGenerationSeed ?? undefined, { profileName });
    addCachedGeneration('character', { url, seed: store.currentGenerationSeed ?? undefined });
    const result = await saveCharacterToDb(store, profileName, profileName, castName);
    setShowSaveCharacterModal(false);
    if (!result.ok && result.error && result.error !== 'Supabase not configured') {
      store.setGenerationStatus('error', result.error);
    }
  };

  const handleSaveNewPose = () => {
    const url = store.currentLiveImageUrl;
    if (url) {
      store.addPose({ imageUrl: url });
    }
  };

  const handleCastInStory = (storyId: string) => {
    const url = store.currentLiveImageUrl;
    if (url) addCharacterRefToStory(storyId, url);
  };

  const toggleHeritage = (value: string) => {
    const next = store.heritageSelection.includes(value)
      ? store.heritageSelection.filter((v) => v !== value)
      : [...store.heritageSelection, value];
    store.setHeritageSelection(next);
  };

  const toggleGender = (value: string) => {
    const next = store.genderSelection.includes(value)
      ? store.genderSelection.filter((v) => v !== value)
      : [...store.genderSelection, value];
    store.setGenderSelection(next);
  };

  const togglePhysical = (category: SurgicalPhysicalKey, value: string) => {
    const current = store.physicalSelections[category] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    store.setPhysicalSelection(category, next);
  };

  const toggleWardrobe = (category: WardrobeCategory, value: string) => {
    const current = store.wardrobeSelections[category] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    store.setWardrobeSelection(category, next);
  };

  return (
    <div
      className="flex flex-col min-h-screen p-4 animate-fade-in"
      style={{ background: CHARACTER_STUDIO_BG_V4 }}
    >
      {/* Header: gold strip (Comic Studio style), title in emerald gradient */}
      <header
        className="flex-shrink-0 flex items-center justify-center w-full mb-3 rounded-lg px-4 py-2"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        <h1
          className="text-center text-2xl font-black text-transparent bg-clip-text tracking-tight truncate min-w-0"
          style={{ background: CHARACTER_STUDIO_EMERALD_TEXT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          REFERENCE CHARACTER STUDIO
        </h1>
      </header>

      {/* Main content: left full height + scroll; center+right capped height + 100px */}
      <div className="flex gap-3 w-full flex-1 min-h-0">
        {/* Left Panel (TAGS): 34% width, same height as Reference Gallery (center+right cap), Import at top then scroll */}
        <div className="flex-[0_0_34%] min-w-0 h-[calc(85vh+100px)] flex flex-col rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden flex-shrink-0">
          {/* Import Image: up to 14 reference slots for API */}
          <div className="flex-shrink-0 p-2 border-b border-white/10">
            <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-2" style={goldTextStyle}>
              Import Image
            </h2>
            <Tooltip
              content="For best results, upload images with a single subject. Up to 14 reference images for the API."
              side="bottom"
            >
              <label className="flex rounded-xl border border-dashed border-amber-500/40 bg-black/30 px-3 py-2.5 cursor-pointer hover:border-amber-500/60 transition-colors">
                <span className="text-xs font-medium inline-block" style={goldTextStyle}>Add reference image ({store.referenceImageUrls.length}/14)</span>
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
                  <div key={i} className="relative group flex flex-col items-center gap-0.5">
                    <div className="relative">
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
                    <span className="text-[10px] text-white/70">{i} · {getSlotLabel(i)}</span>
                    <button
                      type="button"
                      onClick={() => setRecallSlotIndex(i)}
                      className="text-[10px] text-amber-400/90 hover:text-amber-300"
                    >
                      Archive
                    </button>
                  </div>
                ))}
              </div>
            )}
            {hasReferenceImage && (
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={store.diversifyLikeness}
                  onChange={(e) => store.setDiversifyLikeness(e.target.checked)}
                  className="rounded border-amber-500/50"
                />
                <span className="text-xs inline-block" style={goldTextStyle}>Diversify Likeness</span>
              </label>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Art Style Engine */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Art Style Engine
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
                        store.setArtStyle(
                          store.artStyleId === opt ? 'flagship' : opt
                        )
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

            {/* DNA Engine */}
            <section
              className={dnaAndPhysicalDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={dnaAndPhysicalDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                DNA Engine
              </h2>
              {dnaAndPhysicalDisabled && (
                <p className="text-xs text-white/60 mb-2">Uploaded image is absolute reference. Enable &quot;Diversify Likeness&quot; to use tags.</p>
              )}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>Heritage</h3>
                  <div className="flex flex-wrap gap-2">
                    {[...HERITAGE_TAGS, ...store.heritageLibrary].map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        active={store.heritageSelection.includes(tag)}
                        onClick={() => toggleHeritage(tag)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>Gender</h3>
                  <div className="flex flex-wrap gap-2">
                    {[...GENDER_TAGS, ...store.genderLibrary].map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        active={store.genderSelection.includes(tag)}
                        onClick={() => toggleGender(tag)}
                      />
                    ))}
                  </div>
                </div>
                <SectionAddToLibrary
                  categories={[{ id: 'Heritage', label: 'Heritage' }, { id: 'Gender', label: 'Gender' }]}
                  onSave={(cat, v) => cat === 'Heritage' ? store.addHeritageOption(v) : store.addGenderOption(v)}
                />
              </div>
            </section>

            {/* Surgical Physical */}
            <section
              className={dnaAndPhysicalDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={dnaAndPhysicalDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Surgical Physical
              </h2>
              <div className="space-y-4">
                {(Object.keys(SURGICAL_PHYSICAL) as SurgicalPhysicalKey[]).map(
                  (key) => (
                    <div key={key}>
                      <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <MultiChip
                        options={[...SURGICAL_PHYSICAL[key], ...(store.physicalLibraries[key] ?? [])]}
                        selected={store.physicalSelections[key] ?? []}
                        onToggle={(v) => togglePhysical(key, v)}
                      />
                    </div>
                  )
                )}
                <SectionAddToLibrary
                  categories={(Object.keys(SURGICAL_PHYSICAL) as SurgicalPhysicalKey[]).map((k) => ({
                    id: k,
                    label: k.replace(/([A-Z])/g, ' $1').trim(),
                  }))}
                  onSave={(cat, v) => store.addPhysicalOption(cat, v)}
                />
              </div>
            </section>

            {/* Wardrobe Engine */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Wardrobe Engine
              </h2>
              <div className="space-y-2 mb-4">
                {(['tops', 'bottoms', 'outerwear', 'accessories'] as WardrobeModifierCategory[]).map(
                  (cat) => (
                    <ModifierRibbon
                      key={cat}
                      categoryLabel={cat.charAt(0).toUpperCase() + cat.slice(1)}
                      selectedColor={store.wardrobeModifiers[cat].color}
                      material={store.wardrobeModifiers[cat].material}
                      tagLabel={(store.wardrobeSelections[cat] ?? []).join(', ') || undefined}
                      onColorChange={(hex) => store.setWardrobeModifierColor(cat, hex)}
                      onMaterialChange={(material) =>
                        store.setWardrobeModifierMaterial(cat, material)
                      }
                      variant="emerald"
                    />
                  )
                )}
              </div>
              <div className="space-y-4">
                {(Object.keys(WARDROBE_PRESETS) as WardrobeCategory[]).map(
                  (cat) => (
                    <WardrobeRow
                      key={cat}
                      category={cat}
                      presets={WARDROBE_PRESETS[cat]}
                      selected={store.wardrobeSelections[cat] ?? []}
                      library={store.wardrobeLibraries[cat] ?? []}
                      onToggle={(v) => toggleWardrobe(cat, v)}
                    />
                  )
                )}
              </div>
              <SectionAddToLibrary
                categories={(Object.keys(WARDROBE_PRESETS) as WardrobeCategory[]).map((c) => ({
                  id: c,
                  label: c.replace(/([A-Z])/g, ' $1').trim(),
                }))}
                onSave={(cat, v) => store.addWardrobeOption(cat as WardrobeCategory, v)}
              />
            </section>

            {/* Cinematic Suite (no Shot tags per v4) */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Cinematic Suite
              </h2>
              <div className="space-y-4">
                {(Object.keys(CINEMATIC_OPTIONS) as CinematicKey[]).map(
                  (key) => (
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
                  )
                )}
                <SectionAddToLibrary
                  categories={(Object.keys(CINEMATIC_OPTIONS) as CinematicKey[]).map((k) => ({ id: k, label: k }))}
                  onSave={(cat, v) => store.addCinematicOption(cat as CinematicKey, v)}
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

            {/* Tag bar */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Prompt Tags
              </h2>
              <HybridTagBar
                tags={store.tags}
                setTags={store.setTags}
              />
            </section>
          </div>
        </div>

        {/* Center + Right wrapper: capped height + 100px (85vh + 100px) */}
        <div className="flex-1 flex gap-3 min-w-0 min-h-0 max-h-[calc(85vh+100px)] overflow-hidden">
        {/* Center: full width, Live Prompt (+100px height) then Reference Image Generation (+100px down) then Add Pose + pills */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
          {/* Live Prompt: full width, extended height; DNA LOCK at bottom-right */}
          <div className="flex-shrink-0 rounded-xl border border-white/10 bg-black/30 p-3 min-h-[480px] flex flex-col">
            <h2 className="text-base font-bold mb-1.5 uppercase tracking-widest" style={goldTextStyle}>
              Live Prompt
            </h2>
            <div className="bg-black/60 p-2 rounded-lg font-mono text-[10px] text-emerald-100/80 break-words flex-1 min-h-[420px] overflow-y-auto custom-scrollbar">
              {displayPrompt || '// Prompt is empty...'}
            </div>
            <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
              <CopyButton text={displayPrompt} labelStyle={goldTextStyle} />
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-full border border-amber-500/30 bg-black/20 hover:border-amber-500/60 transition-all group ml-auto">
                <span className="text-xs font-bold tracking-widest inline-block" style={goldTextStyle}>
                  DNA LOCK
                </span>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => store.setDnaLock(!store.dnaLock)}
                  onKeyDown={(e) => e.key === 'Enter' && store.setDnaLock(!store.dnaLock)}
                  className="w-10 h-5 rounded-full p-0.5 transition-colors duration-300 bg-white/10"
                  style={store.dnaLock ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      store.dnaLock ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Status breadcrumb: cycle during generation; safety message when blocked */}
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

          {/* Reference Image Generation: same gap as gold bar to panels (gap-3); min height so it keeps space */}
          <div className="flex-1 min-h-[280px] rounded-2xl border border-white/10 bg-black/40 flex flex-col overflow-hidden flex-shrink-0">
            <h2 className="text-base font-bold uppercase tracking-widest px-4 pt-3 pb-1 flex-shrink-0" style={goldTextStyle}>
              Reference Image Generation
            </h2>
            {getCachedGenerations('character').length > 0 && (
              <div className="flex-shrink-0 px-2 pb-2 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] uppercase tracking-wider text-white/60">Recent</span>
                {getCachedGenerations('character').map((item) => (
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
                <>
                  <img
                    src={store.currentLiveImageUrl}
                    alt="Live character"
                    className="max-w-full max-h-full object-contain"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <Tooltip content="View full size with zoom" side="left">
                      <button
                        type="button"
                        onClick={() => {
                          setZoomLevel(1);
                          setShowZoomModal(true);
                        }}
                        className="p-2 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-500/20"
                      >
                        <Expand className="w-4 h-4" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete this image" side="left">
                      <button
                        type="button"
                        onClick={() => store.setCurrentLiveImageUrl(null)}
                        className="p-2 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-500/20"
                        aria-label="Delete image"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                      </button>
                    </Tooltip>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full border border-amber-500/30 mx-auto flex items-center justify-center bg-black/40">
                    <span className="text-2xl">&#9889;</span>
                  </div>
                  <p className="font-mono text-sm inline-block" style={goldTextStyle}>
                    {store.dnaLock ? 'DNA LOCKED' : 'Live Image'}
                  </p>
                </div>
              )}
            </div>
            {/* Add Pose + pill-shaped buttons in one row */}
            <div className="flex flex-wrap items-center gap-3 p-3 border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => store.addPose({})}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/40 hover:bg-amber-500/20"
              >
                <span className="inline-block" style={goldTextStyle}>Add Character Pose</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateCharacter}
                disabled={store.generationStatus === 'pending'}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-black border border-amber-600/50 hover:text-emerald-400 transition-colors disabled:opacity-90 disabled:cursor-wait"
                style={
                  store.generationStatus === 'pending'
                    ? { background: GEM_EMERALD, boxShadow: `0 0 16px ${GEM_EMERALD}` }
                    : { background: ACCENT_GOLD_GRADIENT }
                }
              >
                {store.generationStatus === 'pending' ? (
                  <span
                    className="inline-block w-4 h-4 rounded-sm rotate-45 animate-pulse"
                    style={{ background: GEM_EMERALD, boxShadow: `0 0 10px ${GEM_EMERALD}` }}
                    aria-label="Generating..."
                  />
                ) : (
                  'Generate Character'
                )}
              </button>
              <button
                type="button"
                onClick={handleGenerateAlternate}
                disabled={store.generationStatus === 'pending' || (!store.currentLiveImageUrl && store.referenceImageUrls.length === 0)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/40 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-block" style={goldTextStyle}>Generate Alternate</span>
              </button>
              <button
                type="button"
                onClick={() => openSaveCharacterModal(false)}
                disabled={!store.currentLiveImageUrl}
                className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-block" style={goldTextStyle}>Save New Character</span>
              </button>
              <button
                type="button"
                onClick={handleSaveNewPose}
                disabled={!store.currentLiveImageUrl}
                className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-block" style={goldTextStyle}>Save New Pose</span>
              </button>
              <button
                type="button"
                onClick={() => openSaveCharacterModal(true)}
                disabled={!store.selectedPoseId || !store.currentLiveImageUrl}
                className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-block" style={goldTextStyle}>Save Edited Profile</span>
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

        {/* Right: Reference Gallery 28% width (ref 950/3354), same capped height as center */}
        <div className="flex-[0_0_28%] min-w-0 min-h-0 flex flex-col rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
            <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-2" style={goldTextStyle}>
              Reference Gallery
            </h2>
            <p className="text-xs inline-block" style={goldTextStyle}>
              New generations here are derived from the official Full Body Reference.
            </p>
            {/* Pose gallery: click to set as live, trash to delete */}
            {store.poses.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 inline-block" style={goldTextStyle}>
                  Poses ({store.poses.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {store.poses.map((pose) => (
                    <div
                      key={pose.id}
                      className={`relative rounded-lg border overflow-hidden aspect-[9/16] max-h-28 ${
                        store.selectedPoseId === pose.id ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-white/20'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          store.setSelectedPoseId(pose.id);
                          if (pose.imageUrl) {
                            store.setCurrentLiveImageUrl(pose.imageUrl);
                          }
                        }}
                        className="absolute inset-0 w-full h-full block"
                      >
                        {pose.imageUrl ? (
                          <img src={pose.imageUrl} alt={pose.name ?? 'Pose'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black/50 text-white/50 text-xs">
                            Empty
                          </div>
                        )}
                      </button>
                      <Tooltip content="Delete this pose" side="left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            store.removePose(pose.id);
                            if (store.selectedPoseId === pose.id) {
                              store.setSelectedPoseId(null);
                              store.setCurrentLiveImageUrl(null);
                            }
                          }}
                          className="absolute bottom-1 right-1 p-1.5 rounded bg-black/70 border border-amber-500/40 hover:bg-amber-500/20"
                          aria-label="Delete pose"
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                        </button>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Age Modifier 0-100 */}
            <div>
              <label className="text-xs block mb-1 inline-block" style={goldTextStyle}>Age Modifier</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={store.ageModifier}
                  onChange={(e) => store.setAgeModifier(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-xs w-8 tabular-nums inline-block" style={goldTextStyle}>{store.ageModifier}</span>
              </div>
            </div>
            {/* Aspect Ratio */}
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
            {/* Camera Angle */}
            <div>
              <label className="text-xs block mb-2 inline-block" style={goldTextStyle}>Camera Angle</label>
              <div className="flex flex-wrap gap-2">
                {CINEMATIC_OPTIONS.angle.map((opt) => (
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

      <ArchiveRecallModal
        open={recallSlotIndex !== null}
        onClose={() => setRecallSlotIndex(null)}
        context="character"
        slotIndex={recallSlotIndex ?? 0}
        onSelect={(url) => {
          if (recallSlotIndex != null) {
            store.setReferenceImageAt(recallSlotIndex, url);
            setRecallSlotIndex(null);
          }
        }}
      />

      {/* Save character: profile name (required) + optional cast name */}
      {showSaveCharacterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Save character — profile and cast name"
        >
          <div className="rounded-xl border border-amber-500/40 bg-black/90 backdrop-blur-md p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4" style={goldTextStyle}>
              {saveCharacterIsEditProfile ? 'Save edited profile' : 'Save new character'}
            </h3>
            <label className="block text-sm font-medium text-white/80 mb-1">Profile name (required)</label>
            <input
              type="text"
              value={saveCharacterProfileName}
              onChange={(e) => setSaveCharacterProfileName(e.target.value)}
              placeholder="e.g. Detective Mara"
              className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 mb-3 text-sm placeholder-white/40"
              autoFocus
            />
            <label className="block text-sm font-medium text-white/80 mb-1">Cast name (optional)</label>
            <input
              type="text"
              value={saveCharacterCastName}
              onChange={(e) => setSaveCharacterCastName(e.target.value)}
              placeholder="e.g. Mara in ch. 3"
              className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 mb-4 text-sm placeholder-white/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveCharacterModal(false)}
                className="px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCharacterModalConfirm}
                disabled={!saveCharacterProfileName.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium text-black border border-amber-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: ACCENT_GOLD_GRADIENT }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size image modal with zoom */}
      {showZoomModal && store.currentLiveImageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="View image full size"
        >
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.25, z - 0.25))}
                className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
              </button>
              <span className="text-sm tabular-nums min-w-[4rem]" style={goldTextStyle}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
                className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2 py-1 text-xs rounded border border-white/20 hover:bg-white/10"
              >
                <span className="inline-block" style={goldTextStyle}>Reset</span>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip content="Delete this image" side="bottom">
                <button
                  type="button"
                  onClick={() => {
                    store.setCurrentLiveImageUrl(null);
                    setShowZoomModal(false);
                  }}
                  className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                  aria-label="Delete image"
                >
                  <Trash2 className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                </button>
              </Tooltip>
              <button
                type="button"
                onClick={() => setShowZoomModal(false)}
                className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                aria-label="Close"
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
            <img
              src={store.currentLiveImageUrl}
              alt="Full size character reference"
              className="max-w-none transition-transform origin-center"
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

function WardrobeRow({
  category,
  presets,
  selected,
  library,
  onToggle,
}: {
  category: WardrobeCategory;
  presets: readonly string[];
  selected: string[];
  library: string[];
  onToggle: (v: string) => void;
}) {
  const allOptions = [...presets, ...library];
  return (
    <div>
      <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>{category}</h3>
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
          <div className="bg-emerald-900/95 border border-amber-500/30 rounded-xl p-4 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold text-emerald-100 mb-3">
              Add character to story
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
