import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export const RelatedAlbum: React.FC = () => {
    const { setTheme } = useTheme();

    useEffect(() => {
        setTheme('purple');
    }, [setTheme]);

    return (
        <div className="min-h-screen text-white flex flex-col overflow-hidden pb-32">
            {/* Header Section */}
            <header className="p-6 flex justify-between items-center z-20">
                <div>
                    <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-[#5F368E]/80 mb-1">Nano Banana Expanded</h1>
                    <p className="glow-text text-xl font-semibold">Story Sequence Viewer <span className="text-[#5F368E]/60 font-light ml-2 text-sm">V2.4</span></p>
                </div>
                <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white/80">
                    <span className="material-icons-round">more_vert</span>
                </button>
            </header>

            {/* Main Experience Area */}
            <main className="flex-1 flex flex-col justify-center relative -mt-10 overflow-hidden">
                {/* Film-Strip Container */}
                <div className="relative w-full overflow-hidden">
                    <div className="flex overflow-x-auto snap-x snap-mandatory px-8 gap-6 items-center pb-8 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {/* Scene 01 */}
                        <div className="snap-center shrink-0 w-[85vw] max-w-[400px]">
                            <div className="relative group rounded-xl overflow-hidden border-2 border-[#5F368E]/40 shadow-[0_0_30px_rgba(94,53,141,0.4)]">
                                <img className="w-full aspect-[3/4] object-cover" src="https://images.unsplash.com/photo-1614728853913-1e2221609132?w=500&auto=format" alt="Scene 1" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-4 left-4">
                                    <span className="text-[10px] font-bold tracking-widest text-[#5F368E] bg-white/90 px-2 py-0.5 rounded-sm mb-2 inline-block uppercase">Scene 01</span>
                                    <h3 className="glow-text text-lg font-medium">The Awakening</h3>
                                </div>
                            </div>
                        </div>

                        {/* Scene 02 (Active/Focused View) */}
                        <div className="snap-center shrink-0 w-[85vw] max-w-[400px]">
                            <div className="relative group rounded-xl overflow-hidden border-2 border-[#5F368E] shadow-[0_0_30px_rgba(94,53,141,0.4)] scale-105 transition-transform">
                                <img className="w-full aspect-[3/4] object-cover" src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format" alt="Scene 2" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-4 left-4">
                                    <span className="text-[10px] font-bold tracking-widest text-[#5F368E] bg-white/90 px-2 py-0.5 rounded-sm mb-2 inline-block uppercase">Scene 02</span>
                                    <h3 className="glow-text text-lg font-medium">Celestial Reach</h3>
                                </div>
                                <div className="absolute top-4 right-4 glass-panel rounded-full px-3 py-1 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Rendering</span>
                                </div>
                            </div>
                        </div>

                        {/* Scene 03 */}
                        <div className="snap-center shrink-0 w-[85vw] max-w-[400px]">
                            <div className="relative group rounded-xl overflow-hidden border-2 border-[#5F368E]/20">
                                <img className="w-full aspect-[3/4] object-cover opacity-60" src="https://images.unsplash.com/photo-1549490349-8643362247b5?w=500&auto=format" alt="Scene 3" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-4 left-4">
                                    <span className="text-[10px] font-bold tracking-widest text-white/50 bg-black/40 px-2 py-0.5 rounded-sm mb-2 inline-block uppercase">Scene 03</span>
                                    <h3 className="text-white/60 text-lg font-medium">Neon Descent</h3>
                                </div>
                            </div>
                        </div>

                        {/* Add Scene Placeholder */}
                        <div className="snap-center shrink-0 w-[85vw] max-w-[400px]">
                            <button className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-[#5F368E]/40 bg-[#5F368E]/5 flex flex-col items-center justify-center gap-4 hover:bg-[#5F368E]/10 transition-colors">
                                <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center border-[#5F368E]/30">
                                    <span className="material-icons-round text-[#5F368E] text-4xl">add</span>
                                </div>
                                <div className="text-center">
                                    <p className="glow-text font-semibold uppercase tracking-widest text-sm">Add New Scene</p>
                                    <p className="text-white/40 text-[10px] mt-1 italic">Extrapolate Story Arc</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Metadata Sidebar Peek (Static for now, could be made interactive) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 glass-panel rounded-l-2xl p-6 border-r-0 transform translate-x-56 hover:translate-x-0 transition-transform duration-500 group z-30">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full glass-panel p-2 rounded-l-xl cursor-pointer">
                        <span className="material-icons-round text-white/60 group-hover:rotate-180 transition-transform">chevron_left</span>
                    </div>
                    <h4 className="text-xs font-bold text-[#5F368E]/80 uppercase tracking-widest mb-4">Scene Metadata</h4>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] text-white/40 uppercase block mb-1">Prompt Style</label>
                            <p className="text-sm font-medium italic">"Cinematic Hyper-realism"</p>
                        </div>
                        <div>
                            <label className="text-[10px] text-white/40 uppercase block mb-1">Specs</label>
                            <ul className="text-[11px] space-y-2 text-white/80">
                                <li className="flex justify-between border-b border-white/5 pb-1"><span>Seed:</span> <span className="text-[#5F368E] font-mono">#992011</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Bottom Dock */}
            <div className="fixed bottom-24 left-0 right-0 px-6 z-40">
                <div className="max-w-md mx-auto glass-panel rounded-full h-20 px-4 flex items-center justify-between shadow-[0_0_30px_rgba(94,53,141,0.4)]">
                    {/* Secondary Actions Left */}
                    <div className="flex items-center gap-1">
                        <button className="w-12 h-12 rounded-full flex items-center justify-center text-white/60 hover:text-[#5F368E] transition-colors">
                            <span className="material-icons-round">layers</span>
                        </button>
                        <button className="w-12 h-12 rounded-full flex items-center justify-center text-white/60 hover:text-[#5F368E] transition-colors">
                            <span className="material-icons-round">swap_horiz</span>
                        </button>
                    </div>
                    {/* Primary Play Action */}
                    <button className="w-16 h-16 bg-[#5F368E] rounded-full flex items-center justify-center shadow-lg shadow-[#5F368E]/40 -translate-y-4 border-4 border-[#0F0F12]">
                        <span className="material-icons-round text-white text-3xl ml-1">play_arrow</span>
                    </button>
                    {/* Secondary Actions Right */}
                    <div className="flex items-center gap-1">
                        <button className="w-12 h-12 rounded-full flex items-center justify-center text-white/60 hover:text-[#5F368E] transition-colors">
                            <span className="material-icons-round">auto_fix_high</span>
                        </button>
                        <button className="w-12 h-12 rounded-full flex items-center justify-center text-white/60 hover:text-[#5F368E] transition-colors">
                            <span className="material-icons-round">ios_share</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[40%] bg-[#5F368E]/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[40%] bg-[#5F368E]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        </div>
    );
};
