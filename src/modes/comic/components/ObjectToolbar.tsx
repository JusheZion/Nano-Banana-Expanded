import React from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { TEXTURE_REGISTRY } from '../data/TextureRegistry';
import { Tooltip } from '../../../components/ui/Tooltip';

interface ObjectToolbarProps {
    currentPageId: string;
    selectedElementIds: string[];
}

export const ObjectToolbar: React.FC<ObjectToolbarProps> = ({ currentPageId, selectedElementIds }) => {
    const {
        bringToFront,
        sendToBack,
        cloneElement,
        removeElement,
        toggleFlip,
        pages,
        updatePanel,
        splitPanel
    } = useComicStore();

    if (selectedElementIds.length === 0) return null;

    const currentPage = pages.find(p => p.id === currentPageId);
    const selectedPanels = currentPage?.panels.filter(p => selectedElementIds.includes(p.id)) || [];
    const hasPanels = selectedPanels.length > 0;

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 max-w-[95vw] w-max bg-zinc-900 border border-white/20 rounded-2xl p-2 flex flex-wrap justify-center items-center gap-x-2 gap-y-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">

            {/* Shape Controls (Only for Panels) */}
            {hasPanels && (
                <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                    <Tooltip content="Rectangle Shape">
                        <button
                            onClick={() => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { shapeType: 'rect' }))}
                            className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                            </svg>
                        </button>
                    </Tooltip>
                    <Tooltip content="Ellipse Shape">
                        <button
                            onClick={() => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { shapeType: 'ellipse' }))}
                            className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        </button>
                    </Tooltip>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    <Tooltip content="Split Horizontally (Row)">
                        <button
                            onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId, p.id, 'horizontal', 0))}
                            className="p-2 hover:bg-gold-500/20 rounded-full text-white/70 hover:text-gold-400 transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                            </svg>
                        </button>
                    </Tooltip>
                    <Tooltip content="Split Vertically (Column)">
                        <button
                            onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId, p.id, 'vertical', 0))}
                            className="p-2 hover:bg-gold-500/20 rounded-full text-white/70 hover:text-gold-400 transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <line x1="12" y1="3" x2="12" y2="21" />
                            </svg>
                        </button>
                    </Tooltip>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    <Tooltip content="Split Slanted (Row)">
                        <button
                            onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId, p.id, 'horizontal', 40))}
                            className="p-2 hover:bg-gold-500/20 rounded-full text-white/70 hover:text-gold-400 transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <line x1="3" y1="16" x2="21" y2="8" />
                            </svg>
                        </button>
                    </Tooltip>
                    <Tooltip content="Split Slanted (Column)">
                        <button
                            onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId, p.id, 'vertical', 40))}
                            className="p-2 hover:bg-gold-500/20 rounded-full text-white/70 hover:text-gold-400 transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <line x1="16" y1="3" x2="8" y2="21" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            )}

            {/* Z-Index & Transform Controls */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                {hasPanels && (
                    <Tooltip content="Rotate (15°)">
                        <button
                            onClick={() => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { rotation: ((p.rotation || 0) + 15) % 360 }))}
                            className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12c0-5.523 4.477-10 10-10 5.523 0 10 4.477 10 10 0 1.638-.393 3.185-1.093 4.542M22 6V12h-6"></path>
                            </svg>
                        </button>
                    </Tooltip>
                )}
                <Tooltip content="Flip Horizontal">
                    <button
                        onClick={() => selectedElementIds.forEach(id => toggleFlip(currentPageId, id, 'horizontal'))}
                        className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 3 21 12 16 21"></polyline>
                            <line x1="8" y1="3" x2="8" y2="21"></line>
                            <polyline points="3 7 3 17"></polyline>
                        </svg>
                    </button>
                </Tooltip>
                <Tooltip content="Flip Vertical">
                    <button
                        onClick={() => selectedElementIds.forEach(id => toggleFlip(currentPageId, id, 'vertical'))}
                        className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 16 12 21 21 16"></polyline>
                            <line x1="3" y1="8" x2="21" y2="8"></line>
                            <polyline points="7 3 17 3"></polyline>
                        </svg>
                    </button>
                </Tooltip>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <Tooltip content="Bring to Front">
                    <button
                        onClick={() => selectedElementIds.forEach(id => bringToFront(currentPageId, id))}
                        className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 8h8v8H8z" />
                            <path d="M4 4h8v8H4z" strokeOpacity="0.5" />
                        </svg>
                    </button>
                </Tooltip>
                <Tooltip content="Send to Back">
                    <button
                        onClick={() => selectedElementIds.forEach(id => sendToBack(currentPageId, id))}
                        className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h8v8H4z" />
                            <path d="M8 8h8v8H8z" strokeOpacity="0.5" />
                        </svg>
                    </button>
                </Tooltip>
            </div>

            {/* FX Controls (Panels Only) */}
            {hasPanels && (
                <div className="flex items-center gap-2 border-r border-white/10 pr-2 mr-2">
                    <Tooltip content="Shadow Color">
                        <div className="relative group">
                            <input
                                type="color"
                                value={selectedPanels[0]?.shadowColor || '#000000'}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { shadowColor: e.target.value }))}
                                className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                            />
                        </div>
                    </Tooltip>

                    <Tooltip content="Drop Shadow Preset">
                        <button
                            onClick={() => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { shadowBlur: 10, shadowOffsetX: 5, shadowOffsetY: 5, shadowOpacity: 0.5, shadowColor: '#000000' }))}
                            className="px-2 py-1 hover:bg-white/10 rounded text-white/70 hover:text-white font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                            Shdw
                        </button>
                    </Tooltip>

                    <div className="flex flex-col gap-1 ml-1">
                        <div className="flex items-center gap-1" title="Shadow Blur">
                            <span className="text-white/50 text-[9px] w-6">Blur</span>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                step="1"
                                value={selectedPanels[0]?.shadowBlur ?? 10}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { shadowBlur: parseInt(e.target.value) }))}
                                className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                        <div className="flex items-center gap-1" title="Shadow Opacity">
                            <span className="text-white/50 text-[9px] w-6">Opac</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={selectedPanels[0]?.shadowOpacity ?? 0.3}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { shadowOpacity: parseFloat(e.target.value) }))}
                                className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-1" title="Shadow Offset">
                        <div className="flex items-center gap-1" title="Shadow X">
                            <span className="text-white/50 text-[9px] w-4">X</span>
                            <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={selectedPanels[0]?.shadowOffsetX ?? 5}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { shadowOffsetX: parseInt(e.target.value) }))}
                                className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                        <div className="flex items-center gap-1" title="Shadow Y">
                            <span className="text-white/50 text-[9px] w-4">Y</span>
                            <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={selectedPanels[0]?.shadowOffsetY ?? 5}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { shadowOffsetY: parseInt(e.target.value) }))}
                                className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>

                    {/* Glow Controls */}
                    <div className="flex items-center gap-2 border-l border-white/10 pl-2 ml-1">
                        <button
                            onClick={() => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { glowBlur: 20, glowSpread: 5, glowOpacity: 1, glowColor: '#3B82F6' }))}
                            className="px-2 py-1 hover:bg-blue-500/20 rounded text-blue-400 font-bold text-[10px] uppercase tracking-wider transition-colors"
                            title="Blue Glow Preset"
                        >
                            Glow
                        </button>
                        <div className="relative group" title="Glow Color">
                            <input
                                type="color"
                                value={selectedPanels[0]?.glowColor || '#3B82F6'}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { glowColor: e.target.value }))}
                                className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                            />
                        </div>
                        <div className="flex flex-col gap-1 ml-1">
                            <div className="flex items-center gap-1" title="Glow Size">
                                <span className="text-white/50 text-[9px] w-6">Size</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    step="1"
                                    value={selectedPanels[0]?.glowSpread ?? 0}
                                    onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { glowSpread: parseInt(e.target.value) }))}
                                    className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                            <div className="flex items-center gap-1" title="Glow Blur">
                                <span className="text-white/50 text-[9px] w-6">Blur</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    step="1"
                                    value={selectedPanels[0]?.glowBlur ?? 0}
                                    onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { glowBlur: parseInt(e.target.value) }))}
                                    className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 ml-1" title="Glow Opacity">
                            <div className="flex items-center gap-1">
                                <span className="text-white/50 text-[9px] w-6">Opac</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={selectedPanels[0]?.glowOpacity ?? 0}
                                    onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { glowOpacity: parseFloat(e.target.value) }))}
                                    className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Texture Overlay */}
                    <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1" title="Texture Overlay">
                        <select
                            value={selectedPanels[0]?.textureId || ''}
                            onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { textureId: e.target.value }))}
                            className="bg-zinc-800 text-white text-[10px] font-medium border border-white/20 rounded px-1 min-w-[60px] outline-none cursor-pointer"
                        >
                            <option value="">No Texture</option>
                            {TEXTURE_REGISTRY.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {selectedPanels[0]?.textureId && (
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={selectedPanels[0]?.textureOpacity ?? 0.5}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { textureOpacity: parseFloat(e.target.value) }))}
                                className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                                title="Texture Opacity"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Image Fill Controls (Panels with Image Only) */}
            {hasPanels && selectedPanels[0]?.imageUrl && (
                <div className="flex items-center gap-2 border-r border-white/10 pr-2 mr-2">
                    <select
                        value={selectedPanels[0]?.imageFillMode || 'cover'}
                        onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { imageFillMode: e.target.value as any }))}
                        className="bg-zinc-800 text-white text-[10px] font-medium border border-white/20 rounded px-1 min-w-[60px] outline-none cursor-pointer"
                        title="Image Fill Mode"
                    >
                        <option value="cover">Cover</option>
                        <option value="stretch">Stretch</option>
                        <option value="center">Center</option>
                        <option value="decal">Decal</option>
                    </select>

                    {selectedPanels[0]?.imageFillMode === 'decal' && (
                        <div className="flex flex-col gap-1 ml-1">
                            <div className="flex items-center gap-1" title="Scale">
                                <span className="text-white/50 text-[9px] w-4">S</span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3"
                                    step="0.1"
                                    value={selectedPanels[0]?.imageScale ?? 1}
                                    onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { imageScale: parseFloat(e.target.value) }))}
                                    className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                            <div className="flex items-center gap-1" title="Offset X / Y">
                                <span className="text-white/50 text-[9px] w-4">XY</span>
                                <input
                                    type="range"
                                    min="-500"
                                    max="500"
                                    step="10"
                                    value={selectedPanels[0]?.imageOffsetX ?? 0}
                                    onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { imageOffsetX: parseInt(e.target.value) }))}
                                    className="w-5 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                                <input
                                    type="range"
                                    min="-500"
                                    max="500"
                                    step="10"
                                    value={selectedPanels[0]?.imageOffsetY ?? 0}
                                    onChange={(e) => selectedPanels.forEach(p => updatePanel(currentPageId, p.id, { imageOffsetY: parseInt(e.target.value) }))}
                                    className="w-5 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Lifecycle Controls */}
            <div className="flex items-center gap-1">
                <Tooltip content="Clone (Ctrl+D)">
                    <button
                        onClick={() => selectedElementIds.forEach(id => cloneElement(currentPageId, id))}
                        className="p-2 hover:bg-teal-500/20 hover:text-teal-400 rounded-full text-white/70 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </Tooltip>
                <Tooltip content="Delete (Backspace)">
                    <button
                        onClick={() => selectedElementIds.forEach(id => removeElement(currentPageId, id))}
                        className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-full text-white/70 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
