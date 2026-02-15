import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export const PhotoLab: React.FC = () => {
    const { setTheme } = useTheme();
    const [exposure, setExposure] = useState(0.15);
    const [contrast, setContrast] = useState(-0.08);
    const [saturation, setSaturation] = useState(0.42);

    useEffect(() => {
        setTheme('teal');
    }, [setTheme]);

    return (
        <div className="min-h-screen text-white flex flex-col overflow-hidden pb-32">
            {/* Top Navigation Glass Bar */}
            <header className="p-4 z-50">
                <div className="glass-panel h-16 rounded-xl flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                            <span className="material-icons text-[#37615D]">chevron_left</span>
                        </button>
                        <div className="h-6 w-[1px] bg-white/10"></div>
                        <div className="flex gap-2">
                            <button className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                                <span className="material-icons text-white/70">undo</span>
                            </button>
                            <button className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                                <span className="material-icons text-white/30 cursor-not-allowed">redo</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 glass-panel rounded-full hover:bg-[#37615D]/40 transition-all">
                            <span className="material-icons text-sm">compare</span>
                            <span className="text-xs font-medium uppercase tracking-wider">Compare</span>
                        </button>
                        <button className="bg-[#37615D] hover:bg-[#37615D]/80 px-6 py-2 rounded-full font-semibold transition-all shadow-lg shadow-[#37615D]/20">
                            Save
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Workspace Area */}
            <main className="flex-1 relative flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
                {/* Central Canvas */}
                <div className="flex-1 relative flex items-center justify-center group">
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="relative w-full max-w-lg aspect-[3/4] rounded-xl overflow-hidden canvas-glow ring-1 ring-[#37615D]/30">
                            <img alt="Main editing canvas" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format" />
                            {/* Metadata Overlay */}
                            <div className="absolute bottom-4 left-4 font-mono text-[10px] text-white/50 space-y-1">
                                <p>RES: 4096 x 5120</p>
                                <p>FORMAT: RAW-TIFF</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Adjustment Sidebar */}
                <aside className="w-full md:w-72 lg:w-80 flex flex-col gap-4 z-40">
                    <div className="glass-panel flex-1 rounded-xl p-6 flex flex-col">
                        <h3 className="text-sm font-semibold text-[#37615D] uppercase tracking-[0.2em] mb-8">Adjustments</h3>
                        <div className="space-y-8 flex-1">
                            {/* Exposure */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-white/70 font-medium">EXPOSURE</label>
                                    <span className="font-mono text-xs text-[#37615D]">{exposure > 0 ? '+' : ''}{exposure}</span>
                                </div>
                                <input
                                    className="w-full"
                                    max="1" min="-1" step="0.01"
                                    type="range"
                                    value={exposure}
                                    onChange={(e) => setExposure(parseFloat(e.target.value))}
                                />
                            </div>
                            {/* Contrast */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-white/70 font-medium">CONTRAST</label>
                                    <span className="font-mono text-xs text-[#37615D]">{contrast > 0 ? '+' : ''}{contrast}</span>
                                </div>
                                <input
                                    className="w-full"
                                    max="1" min="-1" step="0.01"
                                    type="range"
                                    value={contrast}
                                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                                />
                            </div>
                            {/* Saturation */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-white/70 font-medium">SATURATION</label>
                                    <span className="font-mono text-xs text-[#37615D]">{saturation > 0 ? '+' : ''}{saturation}</span>
                                </div>
                                <input
                                    className="w-full"
                                    max="1" min="-1" step="0.01"
                                    type="range"
                                    value={saturation}
                                    onChange={(e) => setSaturation(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="h-[1px] bg-white/5 my-4"></div>
                            {/* Presets */}
                            <div className="space-y-4">
                                <label className="text-xs text-white/70 font-medium">PRESET FILTERS</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="bg-[#37615D]/30 border border-[#37615D]/40 p-3 rounded-lg text-xs text-left hover:bg-[#37615D]/50 transition-colors relative overflow-hidden group">
                                        <span className="relative z-10">Emerald Glow</span>
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#37615D] rounded-full"></div>
                                    </button>
                                    <button className="glass-panel border-white/5 p-3 rounded-lg text-xs text-left hover:bg-white/5 transition-colors">
                                        Obsidian Dusk
                                    </button>
                                    <button className="glass-panel border-white/5 p-3 rounded-lg text-xs text-left hover:bg-white/5 transition-colors">
                                        Teal Vapor
                                    </button>
                                    <button className="glass-panel border-white/5 p-3 rounded-lg text-xs text-left hover:bg-white/5 transition-colors">
                                        Deep Iris
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Footer Tools */}
                        <div className="pt-6 mt-6 border-t border-white/5 flex justify-between">
                            <button className="text-xs text-white/50 hover:text-white transition-colors">Reset All</button>
                            <button className="text-xs text-[#37615D] font-bold">Auto-Optimize</button>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Bottom Filmstrip */}
            <footer className="fixed bottom-24 left-0 right-0 z-50 p-4 pointer-events-none">
                <div className="pointer-events-auto glass-panel h-24 rounded-xl flex items-center px-4 gap-4 overflow-hidden shadow-lg mx-auto max-w-3xl">
                    <div className="flex-shrink-0 w-12 h-12 glass-panel rounded-lg flex items-center justify-center">
                        <span className="material-icons text-[#37615D]">auto_awesome</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                        {[
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format',
                            'https://images.unsplash.com/photo-1614728853913-1e2221609132?w=100&auto=format',
                            'https://images.unsplash.com/photo-1549490349-8643362247b5?w=100&auto=format',
                            'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100&auto=format',
                            'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=100&auto=format'
                        ].map((src, i) => (
                            <div key={i} className={`flex-shrink-0 w-16 h-16 rounded-lg glass-panel border-white/5 hover:border-[#37615D]/50 transition-colors p-0.5 cursor-pointer ${i === 0 ? 'ring-2 ring-[#37615D]' : ''}`}>
                                <img alt={`Recent ${i}`} className={`w-full h-full object-cover rounded-[7px] ${i !== 0 ? 'opacity-70 hover:opacity-100' : ''}`} src={src} />
                            </div>
                        ))}
                    </div>
                    <div className="flex-shrink-0 ml-auto flex gap-2">
                        <button className="w-10 h-10 flex items-center justify-center glass-panel rounded-full hover:bg-[#37615D]/20">
                            <span className="material-icons text-white/50">grid_view</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};
