import React, { useRef } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { PRIMARY_BG_FLAT } from '../theme/Phase12DesignTokens';

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
        currentPageId,
        addOverlay
    } = useComicStore();

    const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setPageSettings({ backgroundImage: reader.result as string });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const rb = embedded;
    const content = (
            <div className={`flex-1 overflow-y-auto p-6 space-y-6 min-h-0 ${rb ? '' : ''}`} style={rb ? { color: PRIMARY_BG_FLAT } : undefined}>
                {/* Global Gutter */}
                <div className="settings-group">
                    <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider ${rb ? 'text-inherit' : 'text-white/70'}`}>Layout</h3>
                    <label className={`block text-sm font-medium mb-2 ${rb ? 'text-inherit' : 'text-white'}`}>Global Gutter: {gutterSize}px</label>
                    <input
                        type="range"
                        min={0}
                        max={64}
                        value={gutterSize}
                        onChange={(e) => setGutterSize(Number(e.target.value))}
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${rb ? 'bg-[#002366]/15 [accent-color:#002366]' : 'bg-white/10 accent-[#00D1FF]'}`}
                    />
                </div>

                {/* Page background */}
                <div className="settings-group">
                    <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider ${rb ? 'text-inherit' : 'text-white/70'}`}>Page Background</h3>
                    <div className="space-y-3">
                        <div>
                            <label className={`block text-xs uppercase tracking-widest mb-1 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={pageSettings?.backgroundColor ?? '#1a1a1a'}
                                    onChange={(e) => setPageSettings({ backgroundColor: e.target.value })}
                                    className={`w-10 h-10 rounded border cursor-pointer bg-transparent ${rb ? 'border-[#002366]/30' : 'border-white/20'}`}
                                />
                                <input
                                    type="text"
                                    value={pageSettings?.backgroundColor ?? '#1a1a1a'}
                                    onChange={(e) => setPageSettings({ backgroundColor: e.target.value })}
                                    className={`flex-1 border rounded px-2 py-1.5 text-sm font-mono ${rb ? 'bg-[#002366]/10 border-[#002366]/20 text-inherit' : 'bg-black/30 border-white/10 text-white'}`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-xs uppercase tracking-widest mb-1 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Background opacity</label>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={pageSettings?.bgOpacity ?? 1}
                                onChange={(e) => setPageSettings({ bgOpacity: Number(e.target.value) })}
                                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${rb ? 'bg-[#002366]/15 [accent-color:#002366]' : 'bg-white/10 accent-[#00D1FF]'}`}
                            />
                            <span className={`text-xs ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>{(pageSettings?.bgOpacity ?? 1) * 100}%</span>
                        </div>
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadBg}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full px-3 py-2 rounded border text-sm transition-colors ${rb ? 'border-[#002366]/30 text-inherit hover:bg-[#002366]/10' : 'border-white/20 text-white/80 hover:bg-white/10'}`}
                            >
                                Upload BG
                            </button>
                            {pageSettings?.backgroundImage && (
                                <button
                                    type="button"
                                    onClick={() => setPageSettings({ backgroundImage: undefined })}
                                    className="mt-2 w-full px-3 py-1.5 rounded border border-red-500/50 text-red-400 text-xs hover:bg-red-500/10"
                                >
                                    Clear background image
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Floating overlays (above panels) */}
                <div className="settings-group">
                    <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider ${rb ? 'text-inherit' : 'text-white/70'}`}>Overlays</h3>
                    <p className={`text-xs mb-2 ${rb ? 'text-inherit opacity-70' : 'text-white/50'}`}>Floating images above panels. Select on canvas to move/rotate.</p>
                    <button
                        type="button"
                        disabled={!currentPageId}
                        onClick={() => currentPageId && addOverlay(currentPageId, {
                            type: 'image',
                            src: 'https://via.placeholder.com/120',
                            x: 200,
                            y: 200,
                            rotation: 0,
                            scaleX: 1,
                            scaleY: 1,
                            zIndex: 0
                        })}
                        className={`w-full px-3 py-2 rounded border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${rb ? 'border-[#002366]/30 text-inherit hover:bg-[#002366]/10' : 'border-white/20 text-white/80 hover:bg-white/10'}`}
                    >
                        Add overlay (test image)
                    </button>
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
