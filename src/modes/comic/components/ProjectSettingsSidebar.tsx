import React, { useRef } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { PRIMARY_BG_FLAT } from '../theme/Phase12DesignTokens';
import { PrecisionSlider } from './PrecisionSlider';
import { useShallow } from 'zustand/react/shallow';

interface ProjectSettingsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    /** When true, render only inner content for use inside ComicPanelStack (no wrapper, no header). */
    embedded?: boolean;
}

export const ProjectSettingsSidebar: React.FC<ProjectSettingsSidebarProps> = ({ isOpen, onClose, embedded }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        projectSettings,
        updateProjectSettings,
        gutterSize,
        setGutterSize,
        pageSettings,
        setPageSettings,
        setPageBackground,
        currentPageId,
        pages,
        templates,
        saveBlankPanelTemplate,
        applyTemplate,
    } = useComicStore(
        useShallow((s) => ({
            projectSettings: s.projectSettings,
            updateProjectSettings: s.updateProjectSettings,
            gutterSize: s.gutterSize,
            setGutterSize: s.setGutterSize,
            pageSettings: s.pageSettings,
            setPageSettings: s.setPageSettings,
            setPageBackground: s.setPageBackground,
            currentPageId: s.currentPageId,
            pages: s.pages,
            templates: s.templates,
            saveBlankPanelTemplate: s.saveBlankPanelTemplate,
            applyTemplate: s.applyTemplate,
        })),
    );

    const currentPage = pages.find(p => p.id === currentPageId);
    // Per-page background: prefer this page's own image; fall back to the legacy global one.
    const pageBgImage = currentPage?.backgroundImage ?? pageSettings?.backgroundImage;
    const pageBgFillMode = currentPage?.bgFillMode ?? 'cover';
    const pageBgFocusX = currentPage?.bgFocusX ?? 0.5;
    const pageBgFocusY = currentPage?.bgFocusY ?? 0.5;
    const pageBgOpacity = currentPage?.bgOpacity ?? pageSettings?.bgOpacity ?? 1;

    const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentPageId) return;
        const reader = new FileReader();
        // Set THIS page's background only (was global before).
        reader.onload = () => setPageBackground(currentPageId, { backgroundImage: reader.result as string });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const rb = embedded;
    const content = (
            <div className={`flex-1 overflow-y-auto p-6 space-y-6 min-h-0 ${rb ? '' : ''}`} style={rb ? { color: PRIMARY_BG_FLAT } : undefined}>
                {/* Interface */}
                <div className="settings-group">
                    <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider ${rb ? 'text-inherit' : 'text-white/70'}`}>Interface</h3>
                    <div className="flex items-center justify-between mb-2">
                        <label className={`text-sm font-medium cursor-pointer ${rb ? 'text-inherit' : 'text-white'}`} htmlFor="ribbon-pinned-default">
                            Ribbon pinned by default
                        </label>
                        <input
                            type="checkbox"
                            id="ribbon-pinned-default"
                            checked={projectSettings?.ribbonPinnedDefault ?? false}
                            onChange={(e) => updateProjectSettings({ ribbonPinnedDefault: e.target.checked })}
                            className="rounded border-white/20 accent-[#002366]"
                        />
                    </div>
                    <p className={`text-xs ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>When on, the tool ribbon below the menu bar stays visible by default. When off, it shows only when a menu (e.g. Text, Objects) is open or something is selected.</p>
                </div>

                {/* Global Gutter */}
                <div className="settings-group">
                    <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider ${rb ? 'text-inherit' : 'text-white/70'}`}>Layout</h3>
                    <PrecisionSlider
                        min={0}
                        max={64}
                        step={1}
                        value={gutterSize}
                        onChange={setGutterSize}
                        label="Global Gutter"
                        valueLabel={`${gutterSize}px`}
                        width="100%"
                        showTicks={true}
                        tickCount={9}
                        snapToTick={true}
                        showPrecisionButtons={true}
                        aria-label="Global gutter size"
                    />
                </div>

                {/* Page background */}
                <div className="settings-group">
                    <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider ${rb ? 'text-inherit' : 'text-white/70'}`}>Page Background</h3>
                    <div className="space-y-3">
                        <div>
                            <label className={`block text-xs uppercase tracking-widest mb-1 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Default for new pages</label>
                            <p className={`text-[11px] mb-2 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Used when creating new pages and as fallback. New users get white (#ffffff).</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={projectSettings?.defaultPageBackgroundColor ?? '#ffffff'}
                                    onChange={(e) => updateProjectSettings({ defaultPageBackgroundColor: e.target.value })}
                                    className={`w-10 h-10 rounded border cursor-pointer bg-transparent ${rb ? 'border-[#002366]/30' : 'border-white/20'}`}
                                />
                                <input
                                    type="text"
                                    value={projectSettings?.defaultPageBackgroundColor ?? '#ffffff'}
                                    onChange={(e) => updateProjectSettings({ defaultPageBackgroundColor: e.target.value })}
                                    className={`flex-1 border rounded px-2 py-1.5 text-sm font-mono ${rb ? 'bg-[#002366]/10 border-[#002366]/20 text-inherit' : 'bg-black/30 border-white/10 text-white'}`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-xs uppercase tracking-widest mb-1 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Current canvas color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={pageSettings?.backgroundColor ?? (projectSettings?.defaultPageBackgroundColor ?? '#ffffff')}
                                    onChange={(e) => setPageSettings({ backgroundColor: e.target.value })}
                                    className={`w-10 h-10 rounded border cursor-pointer bg-transparent ${rb ? 'border-[#002366]/30' : 'border-white/20'}`}
                                />
                                <input
                                    type="text"
                                    value={pageSettings?.backgroundColor ?? (projectSettings?.defaultPageBackgroundColor ?? '#ffffff')}
                                    onChange={(e) => setPageSettings({ backgroundColor: e.target.value })}
                                    className={`flex-1 border rounded px-2 py-1.5 text-sm font-mono ${rb ? 'bg-[#002366]/10 border-[#002366]/20 text-inherit' : 'bg-black/30 border-white/10 text-white'}`}
                                />
                            </div>
                        </div>
                        <div>
                            <PrecisionSlider
                                min={0}
                                max={1}
                                step={0.05}
                                value={pageBgOpacity}
                                onChange={(v) => currentPageId && setPageBackground(currentPageId, { bgOpacity: v })}
                                label="Background opacity"
                                valueLabel={`${Math.round(pageBgOpacity * 100)}%`}
                                width="100%"
                                showTicks={true}
                                tickCount={5}
                                snapToTick={true}
                                showPrecisionButtons={true}
                                aria-label="Background opacity"
                            />
                        </div>
                        <div>
                            <p className={`text-[11px] mb-1.5 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Background image applies to <strong>this page only</strong>.</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadBg}
                            />
                            <button
                                type="button"
                                disabled={!currentPageId}
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full px-3 py-2 rounded border text-sm transition-colors disabled:opacity-50 ${rb ? 'border-[#002366]/30 text-inherit hover:bg-[#002366]/10' : 'border-white/20 text-white/80 hover:bg-white/10'}`}
                            >
                                Upload BG for this page
                            </button>
                            {pageBgImage && (
                                <>
                                    <label className={`block text-xs uppercase tracking-widest mt-3 mb-1 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Fit</label>
                                    <select
                                        value={pageBgFillMode}
                                        onChange={(e) => currentPageId && setPageBackground(currentPageId, { bgFillMode: e.target.value as 'cover' | 'contain' | 'stretch' | 'center' })}
                                        aria-label="Background image fit"
                                        className={`w-full border rounded px-2 py-1.5 text-sm ${rb ? 'bg-[#002366]/10 border-[#002366]/20 text-inherit' : 'bg-black/30 border-white/10 text-white'}`}
                                    >
                                        <option value="cover">Cover — fill page, no distortion (crops)</option>
                                        <option value="contain">Contain — whole image fits (may letterbox)</option>
                                        <option value="center">Center — original size, centered</option>
                                        <option value="stretch">Stretch — fill exactly (distorts)</option>
                                    </select>
                                    {pageBgFillMode !== 'stretch' && (
                                        <div className="mt-2 space-y-2">
                                            <PrecisionSlider
                                                min={0} max={1} step={0.05}
                                                value={pageBgFocusX}
                                                onChange={(v) => currentPageId && setPageBackground(currentPageId, { bgFocusX: v })}
                                                label="Horizontal position"
                                                valueLabel={`${Math.round(pageBgFocusX * 100)}%`}
                                                width="100%" showPrecisionButtons={true}
                                                aria-label="Background horizontal position"
                                            />
                                            <PrecisionSlider
                                                min={0} max={1} step={0.05}
                                                value={pageBgFocusY}
                                                onChange={(v) => currentPageId && setPageBackground(currentPageId, { bgFocusY: v })}
                                                label="Vertical position"
                                                valueLabel={`${Math.round(pageBgFocusY * 100)}%`}
                                                width="100%" showPrecisionButtons={true}
                                                aria-label="Background vertical position"
                                            />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => currentPageId && setPageBackground(currentPageId, { backgroundImage: undefined })}
                                        className="mt-2 w-full px-3 py-1.5 rounded border border-red-500/50 text-red-400 text-xs hover:bg-red-500/10"
                                    >
                                        Clear background image
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Floating overlays (above panels) */}
                <div className="settings-group">
                    <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider ${rb ? 'text-inherit' : 'text-white/70'}`}>Panel templates</h3>
                    <p className={`text-xs mb-2 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Save current page layout or apply a saved template.</p>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            disabled={!currentPageId || !pages.find(p => p.id === currentPageId)?.panels?.length}
                            onClick={() => currentPageId && saveBlankPanelTemplate(currentPageId)}
                            className={`w-full px-3 py-2 rounded border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${rb ? 'border-[#002366]/30 text-inherit hover:bg-[#002366]/10' : 'border-white/20 text-white/80 hover:bg-white/10'}`}
                        >
                            Save blank panel template
                        </button>
                        {templates.length > 0 && (
                            <div>
                                <label className={`block text-xs mb-1 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Apply template</label>
                                <select
                                    className={`w-full px-3 py-2 rounded border text-sm bg-transparent ${rb ? 'border-[#002366]/30 text-inherit' : 'border-white/20 text-white/80'}`}
                                    value=""
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        e.target.value = '';
                                        if (id && currentPageId) applyTemplate(currentPageId, id);
                                    }}
                                >
                                    <option value="" disabled>Select template...</option>
                                    {templates.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.panels.length} panels)</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider ${rb ? 'text-inherit' : 'text-white/70'}`}>AI Generation Settings</h3>

                    <div className="flex items-center justify-between mb-4">
                        <label className={`text-sm font-medium cursor-pointer ${rb ? 'text-inherit' : 'text-white'}`} htmlFor="inclusive-toggle">
                            Inclusive Bias / Smart Defaults
                        </label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                name="toggle"
                                id="inclusive-toggle"
                                checked={projectSettings?.inclusiveBiasEnabled ?? true}
                                onChange={(e) => updateProjectSettings({ inclusiveBiasEnabled: e.target.checked })}
                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-gold-500"
                            />
                            <label htmlFor="inclusive-toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer"></label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-xs uppercase tracking-widest ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Demographic Focus (Appended if no specific identity term is found)</label>
                        <textarea
                            value={projectSettings?.demographicFocus || ''}
                            onChange={(e) => updateProjectSettings({ demographicFocus: e.target.value })}
                            className={`w-full border rounded p-2 text-sm outline-none min-h-[80px] ${rb ? 'bg-[#002366]/10 border-[#002366]/20 text-inherit focus:border-[#002366]' : 'bg-black/30 border-white/10 text-white focus:border-gold-500'}`}
                            placeholder="e.g. African-American or Blatino man"
                        />
                    </div>
                </div>
            </div>
    );

    if (embedded) {
        return <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{content}</div>;
    }

    return (
        <div
            className={`absolute top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-[#1A1A1E] border-l border-white/[0.08] shadow-2xl transition-transform duration-300 transform z-30 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0F0F12]/80">
                <h2 className="text-white font-bold tracking-wide">PROJECT SETTINGS</h2>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                    ✕
                </button>
            </div>
            {content}
        </div>
    );
};
