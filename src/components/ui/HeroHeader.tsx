import React from 'react';

export const HeroHeader: React.FC = () => {
    return (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden glass-panel border border-white/10 group">
            {/* Background Mesh Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-crimson/20 via-black to-purple-900/20 opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                    <span className="text-xs uppercase tracking-widest text-white/60">System Online</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    Nano Banana
                </h1>

                <p className="text-xl text-white/50 max-w-xl font-light tracking-wide">
                    Advanced AI Image Generation & Cinematic Storytelling Platform.
                </p>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-8 mt-12 w-full max-w-2xl border-t border-white/5 pt-8">
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-teal-400">24</span>
                        <span className="text-xs uppercase tracking-widest text-white/30 mt-1">Projects</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-purple-400">1.2k</span>
                        <span className="text-xs uppercase tracking-widest text-white/30 mt-1">Assets Generated</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-crimson">85%</span>
                        <span className="text-xs uppercase tracking-widest text-white/30 mt-1">Efficiency</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
