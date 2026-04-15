import React from 'react';
import { ModifierRibbon } from '@/components/ui/ModifierRibbon';
import { HybridTagBar } from '@/components/HybridTagBar';
import { ACCENT_GOLD_GRADIENT } from '@/shared/theme/Phase12DesignTokens';
import { useAssetStudioStore } from '@/stores/assetStudioStore';
import {
  ERA_STYLE_TAGS,
  LOCATION_TYPE_TAGS,
  ARCHITECTURAL_DETAIL_TAGS,
  SET_DRESSING_PRESETS,
  CINEMATIC_OPTIONS,
  ART_STYLE_FLAGSHIP,
  ART_STYLE_LIBRARY,
  type SetDressingCategory,
  type AssetCinematicKey,
} from '@/data/asset_studio_spec';
import {
  Chip,
  ChipWithOptionalRemove,
  MultiChip,
  SectionAddToLibrary,
  SetDressingRow,
  goldTextStyle,
} from './assetStudioShared';

type Props = {
  settingAndLocationDisabled: boolean;
  toggleEra: (value: string) => void;
  toggleLocation: (value: string) => void;
  toggleArchitectural: (value: string) => void;
  toggleSetDressing: (category: SetDressingCategory, value: string) => void;
  simpleMode: boolean;
};

export const AssetStudioStructuralPanel: React.FC<Props> = ({
  settingAndLocationDisabled,
  toggleEra,
  toggleLocation,
  toggleArchitectural,
  toggleSetDressing,
  simpleMode,
}) => {
  const store = useAssetStudioStore();
  const dressingCategories = Object.keys(SET_DRESSING_PRESETS) as SetDressingCategory[];
  const simpleDressingCats: SetDressingCategory[] = simpleMode ? ['roomType'] : dressingCategories;

  return (
    <>
      <section
        className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
        aria-disabled={settingAndLocationDisabled}
      >
        <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
          Era / Style
        </h2>
        {settingAndLocationDisabled && (
          <p className="text-xs text-white/60 mb-2">
            Architectural Lock is on. Turn off to edit setting/location tags.
          </p>
        )}
        <MultiChip
          options={[...ERA_STYLE_TAGS, ...store.eraStyleLibrary]}
          selected={store.eraStyleSelection}
          onToggle={toggleEra}
          libraryOptions={store.eraStyleLibrary}
          onRemoveLibrary={(v) => store.removeEraStyleOption(v)}
        />
        {!simpleMode && (
          <SectionAddToLibrary
            categories={[{ id: 'era', label: 'Era / Style' }]}
            onSave={(_id, v) => store.addEraStyleOption(v)}
          />
        )}
      </section>

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
          libraryOptions={store.locationTypeLibrary}
          onRemoveLibrary={(v) => store.removeLocationTypeOption(v)}
        />
        {!simpleMode && (
          <SectionAddToLibrary
            categories={[{ id: 'location', label: 'Location Type' }]}
            onSave={(_id, v) => store.addLocationTypeOption(v)}
          />
        )}
      </section>

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
          libraryOptions={store.architecturalDetailLibrary}
          onRemoveLibrary={(v) => store.removeArchitecturalDetailOption(v)}
        />
        {!simpleMode && (
          <SectionAddToLibrary
            categories={[{ id: 'arch', label: 'Architectural Detail' }]}
            onSave={(_id, v) => store.addArchitecturalDetailOption(v)}
          />
        )}
      </section>

      <section
        className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
        aria-disabled={settingAndLocationDisabled}
      >
        <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
          Scene Setting & Props
        </h2>
        <div className="space-y-4">
          {simpleDressingCats.map((cat) => {
            const isStructure = cat === 'roomType';
            const isFurniture = cat === 'furniture';
            const isAtmospherics = cat === 'surfaceTextures';
            return (
              <div key={cat}>
                <SetDressingRow
                  category={cat}
                  presets={SET_DRESSING_PRESETS[cat]}
                  selected={store.setDressingSelections[cat] ?? []}
                  library={store.setDressingLibraries[cat] ?? []}
                  onToggle={(v) => toggleSetDressing(cat, v)}
                  onRemoveLibrary={(v) => store.removeSetDressingOption(cat, v)}
                />
                {isStructure && (
                  <div className="mt-2">
                    <ModifierRibbon
                      categoryLabel="Structure"
                      selectedColor={store.assetModifiers.structure.color}
                      material={store.assetModifiers.structure.material}
                      tagLabel={(store.setDressingSelections.roomType ?? []).join(', ') || undefined}
                      onColorChange={(hex) => store.setAssetModifierColor('structure', hex)}
                      onMaterialChange={(m) => store.setAssetModifierMaterial('structure', m)}
                      variant="amethyst"
                    />
                  </div>
                )}
                {!simpleMode && isFurniture && (
                  <div className="mt-2">
                    <ModifierRibbon
                      categoryLabel="Furniture"
                      selectedColor={store.assetModifiers.furniture.color}
                      material={store.assetModifiers.furniture.material}
                      tagLabel={(store.setDressingSelections.furniture ?? []).join(', ') || undefined}
                      onColorChange={(hex) => store.setAssetModifierColor('furniture', hex)}
                      onMaterialChange={(m) => store.setAssetModifierMaterial('furniture', m)}
                      variant="amethyst"
                    />
                  </div>
                )}
                {!simpleMode && isAtmospherics && (
                  <div className="mt-2">
                    <ModifierRibbon
                      categoryLabel="Atmospherics"
                      selectedColor={store.assetModifiers.atmospherics.color}
                      material={store.assetModifiers.atmospherics.material}
                      tagLabel={[
                        ...(store.setDressingSelections.lightingFixtures ?? []),
                        ...(store.setDressingSelections.surfaceTextures ?? []),
                      ].join(', ') || undefined}
                      onColorChange={(hex) => store.setAssetModifierColor('atmospherics', hex)}
                      onMaterialChange={(m) => store.setAssetModifierMaterial('atmospherics', m)}
                      variant="amethyst"
                    />
                  </div>
                )}
              </div>
            );
          })}
          {!simpleMode && (
            <button
              type="button"
              onClick={() => store.resetAssetModifiers()}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/40 hover:bg-amber-500/20"
            >
              <span className="inline-block" style={goldTextStyle}>Clear colors & materials</span>
            </button>
          )}
        </div>
        {!simpleMode && (
          <SectionAddToLibrary
            categories={dressingCategories.map((c) => ({
              id: c,
              label: c.replace(/([A-Z])/g, ' $1').trim(),
            }))}
            onSave={(cat, v) => store.addSetDressingOption(cat as SetDressingCategory, v)}
          />
        )}
      </section>
    </>
  );
};

type MaterialProps = {
  simpleMode: boolean;
  customStyleInput: string;
  setCustomStyleInput: (v: string) => void;
};

export const AssetStudioMaterialPanel: React.FC<MaterialProps> = ({
  simpleMode,
  customStyleInput,
  setCustomStyleInput,
}) => {
  const store = useAssetStudioStore();
  const cinematicKeys = Object.keys(CINEMATIC_OPTIONS) as AssetCinematicKey[];
  const simpleCinematicKeys: AssetCinematicKey[] = simpleMode ? ['angle'] : cinematicKeys;

  return (
    <>
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
            {!simpleMode &&
              store.customStyles.map((opt) => (
                <ChipWithOptionalRemove
                  key={opt}
                  label={opt}
                  active={store.artStyleId === opt}
                  onClick={() =>
                    store.setArtStyle(store.artStyleId === opt ? 'flagship' : opt)
                  }
                  isCustom
                  onRemove={() => store.removeCustomStyle(opt)}
                />
              ))}
          </div>
          {!simpleMode && (
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
          )}
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
          Cinematic Suite
        </h2>
        <div className="space-y-4">
          {simpleCinematicKeys.map((key) => (
            <div key={key}>
              <h3 className="text-sm mb-2 inline-block font-semibold" style={goldTextStyle}>{key}</h3>
              <div className="flex flex-wrap gap-2">
                {[...CINEMATIC_OPTIONS[key], ...(store.cinematicLibraries[key] ?? [])].map((opt) => (
                  <ChipWithOptionalRemove
                    key={opt}
                    label={opt}
                    active={(store.cinematic[key] || '') === opt}
                    onClick={() => store.setCinematic(key, opt)}
                    isCustom={(store.cinematicLibraries[key] ?? []).includes(opt)}
                    onRemove={
                      (store.cinematicLibraries[key] ?? []).includes(opt)
                        ? () => store.removeCinematicOption(key, opt)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))}
          {!simpleMode && (
            <SectionAddToLibrary
              categories={cinematicKeys.map((k) => ({ id: k, label: k }))}
              onSave={(cat, v) => store.addCinematicOption(cat as AssetCinematicKey, v)}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
          The Onyx Vault
        </h2>
        <p className="text-xs text-white/70">
          Edit the raw prompt override in <strong className="text-amber-300/90">Live Prompt → Edit</strong>. Leave it
          empty to use compiled tags; when non-empty it replaces the tag-built prompt for generation.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
          Prompt Tags
        </h2>
        <HybridTagBar tags={store.tags} setTags={store.setTags} variant="amethyst" />
      </section>
    </>
  );
};
