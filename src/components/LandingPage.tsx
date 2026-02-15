import React from 'react';
import { Sparkles, ArrowRight, Layers, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LandingPage: React.FC = () => {
    const { setTheme } = useTheme();

    return (
        <div className="space-y-8 animate-fade-in p-8 pb-20">
            {/* Hero Section - High Fidelity Glass */}
            <div className="relative h-96 rounded-[30px] overflow-hidden group shadow-premium ring-1 ring-white/10">
                {/* Dynamic Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#893741] via-[#0F0F12] to-[#5F368E] opacity-80 z-0" />
                <div className="absolute inset-0 bg-[url('/assets/images/Aries%20Approaches%20the%20Observatory.png')] bg-cover bg-center opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-[2s]" />

                {/* Glass Slices Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-transparent to-transparent opacity-90" />

                <div className="relative z-20 h-full flex flex-col justify-end p-12 max-w-4xl">
                    <div className="inline-flex items-center space-x-3 mb-6">
                        <div className="px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full backdrop-blur-md shadow-[0_0_10px_rgba(55,97,93,0.3)]">
                            <span className="text-[#00FFC2] text-[10px] font-bold tracking-widest uppercase">Project Alpha</span>
                        </div>
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                            <span className="text-white/60 text-[10px] font-bold tracking-widest uppercase">v2.4.0</span>
                        </div>
                    </div>

                    <h1 className="text-7xl font-black text-white mb-6 tracking-tighter leading-[0.9] drop-shadow-2xl">
                        Visualizing the <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFC2] via-white to-[#BF5AF2] animate-pulse-slow">Cinematic Universe</span>
                    </h1>

                    <p className="text-xl text-white/60 max-w-2xl leading-relaxed font-light tracking-wide mb-8">
                        Manage your characters, reference libraries, and generated sequences in a unified, <span className="text-white font-medium">jewel-tone glass environment</span>.
                    </p>
                </div>
            </div>

            {/* Quick Access Grid - Jewel Tone Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Card 1: Studio (Teal) */}
                <div onClick={() => setTheme('teal')} className="h-80 relative group cursor-pointer rounded-[24px] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_10px_40px_-10px_rgba(55,97,93,0.5)] border border-white/5 hover:border-[#37615D]/50">
                    <div className="absolute inset-0 bg-[url('/assets/images/City%20of%20Aquarius.jpg')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-[#37615D]/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

                    <div className="absolute bottom-0 left-0 p-6 w-full">
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 group-hover:bg-[#37615D] group-hover:border-[#00FFC2] transition-colors">
                            <Layers className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1 leading-none">Character Studio</h3>
                        <p className="text-xs text-[#00FFC2] font-medium tracking-wide">CREATE & EDIT</p>
                    </div>
                </div>

                {/* Card 2: Reference (Purple) */}
                <div onClick={() => setTheme('purple')} className="h-80 relative group cursor-pointer rounded-[24px] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_10px_40px_-10px_rgba(95,54,142,0.5)] border border-white/5 hover:border-[#5F368E]/50">
                    <div className="absolute inset-0 bg-[url('/assets/images/Aries%20Palace.jpg')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-[#5F368E]/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

                    <div className="absolute bottom-0 left-0 p-6 w-full">
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 group-hover:bg-[#5F368E] group-hover:border-[#BF5AF2] transition-colors">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1 leading-none">Reference Album</h3>
                        <p className="text-xs text-[#BF5AF2] font-medium tracking-wide">VISUAL LIBRARY</p>
                    </div>
                </div>

                {/* Card 3: Related (Purple/Crimson Mix) */}
                <div onClick={() => setTheme('purple')} className="h-80 relative group cursor-pointer rounded-[24px] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_10px_40px_-10px_rgba(137,55,65,0.5)] border border-white/5 hover:border-[#893741]/50">
                    <div className="absolute inset-0 bg-[url('/assets/images/Anunnaki%20Sphinx.png')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-[#893741]/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

                    <div className="absolute bottom-0 left-0 p-6 w-full">
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 group-hover:bg-[#893741] group-hover:border-[#FF5A5A] transition-colors">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1 leading-none">Related Album</h3>
                        <p className="text-xs text-[#FF5A5A] font-medium tracking-wide">CONNECTED MEDIA</p>
                    </div>
                </div>

                {/* Card 4: Photo Lab (Gold) */}
                <div onClick={() => setTheme('gold')} className="h-80 relative group cursor-pointer rounded-[24px] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_10px_40px_-10px_rgba(212,175,55,0.5)] border border-white/5 hover:border-[#D4AF37]/50">
                    <div className="absolute inset-0 bg-[url('/assets/images/Aquarius%20Sphere.jpg')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-[#D4AF37]/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

                    <div className="absolute bottom-0 left-0 p-6 w-full">
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 group-hover:bg-[#D4AF37] group-hover:border-[#FFE57F] transition-colors">
                            <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1 leading-none">Photo Lab</h3>
                        <p className="text-xs text-[#FFE57F] font-medium tracking-wide">EXPERIMENTAL</p>
                    </div>
                </div>

            </div>
        </div>
    );
};
