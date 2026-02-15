import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useProject } from '../context/ProjectContext';
import { HybridTagBar } from '../components/HybridTagBar';
import { CopyButton } from '../components/CopyButton';
import { PromptCompiler } from '../utils/PromptCompiler';

export const CharacterStudio: React.FC = () => {
    const { setTheme } = useTheme();
    const { tags, setTags, dnaLock, setDnaLock, library } = useProject();

    // Derived state for compiled prompt
    const compiledPrompt = PromptCompiler.compile(tags, '');

    useEffect(() => {
        setTheme('teal');
    }, [setTheme]);

    return (
        <div className="p-8 pb-32 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-teal-500 tracking-tighter filter drop-shadow-[0_0_10px_rgba(55,97,93,0.5)]">
                    CHARACTER<br />STUDIO
                </h1>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer glass-card px-5 py-3 rounded-full hover:border-teal-500/50 transition-all group">
                        <span className="text-xs font-bold text-teal-300 tracking-widest group-hover:text-teal-200">DNA LOCK</span>
                        <div
                            onClick={() => setDnaLock(!dnaLock)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${dnaLock ? 'bg-teal-500 shadow-[0_0_15px_rgba(55,97,93,0.6)]' : 'bg-white/10'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${dnaLock ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">
                {/* Left Panel: DNA / Structure (Glassmorphic) */}
                <div className="col-span-3 glass-panel p-6 rounded-3xl overflow-y-auto custom-scrollbar border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                    <h2 className="text-sm font-bold mb-6 text-white/40 uppercase tracking-[0.2em] sticky top-0 bg-[#0F0F12]/80 backdrop-blur-xl py-2 z-10">Structure DNA</h2>

                    <div className="space-y-8">
                        {/* Dynamic Render of Tier 1 Categories */}
                        {Object.entries(library.tag_library.tier_1_global).map(([category, options]) => (
                            <div key={category} className="space-y-3">
                                <h3 className="text-[10px] font-bold uppercase opacity-60 tracking-wider text-teal-300 border-b border-teal-500/20 pb-1 w-max">{category.replace('_', ' ')}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(options as string[]).map(option => (
                                        <button
                                            key={option}
                                            onClick={() => setTags([...tags, { id: crypto.randomUUID(), text: option, polarity: 'positive' }])}
                                            className="
                                                px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide
                                                bg-white/5 border border-white/10 text-white/70
                                                hover:bg-teal-500/20 hover:border-teal-400/50 hover:text-white hover:scale-105 hover:shadow-[0_0_10px_rgba(55,97,93,0.3)]
                                                active:scale-95 transition-all duration-200
                                                backdrop-blur-md
                                            "
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Dynamic Render of Tier 2 Categories */}
                        {Object.entries(library.tag_library.tier_2_architecture).map(([category, options]) => (
                            <div key={category} className="space-y-3">
                                <h3 className="text-[10px] font-bold uppercase opacity-60 tracking-wider text-purple-300 border-b border-purple-500/20 pb-1 w-max">{category.replace('_', ' ')}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(options as string[]).map(option => (
                                        <button
                                            key={option}
                                            onClick={() => setTags([...tags, { id: crypto.randomUUID(), text: option, polarity: 'positive' }])}
                                            className="
                                                px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide
                                                bg-white/5 border border-white/10 text-white/70
                                                hover:bg-purple-500/20 hover:border-purple-400/50 hover:text-white hover:scale-105 hover:shadow-[0_0_10px_rgba(95,54,142,0.3)]
                                                active:scale-95 transition-all duration-200
                                                backdrop-blur-md
                                            "
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Preview (Cinematic Glass) */}
                <div className="col-span-6 glass-panel rounded-3xl relative overflow-hidden group border border-white/10 shadow-2xl flex flex-col">
                    {/* Placeholder Preview Area */}
                    <div className="flex-1 bg-black/40 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-black/0 to-black/0 animate-pulse-slow" />
                        <div className="text-center space-y-2 z-10">
                            <div className="w-16 h-16 rounded-full border border-white/10 mx-auto flex items-center justify-center bg-white/5 backdrop-blur-md">
                                <span className="text-2xl">⚡️</span>
                            </div>
                            <p className="text-white/30 font-mono text-sm tracking-widest">
                                {dnaLock ? 'DNA LOCKED' : 'WAITING FOR INPUT'}
                            </p>
                        </div>
                    </div>

                    {/* Prompt Bar Overlay (Floating Glass) */}
                    <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <HybridTagBar tags={tags} setTags={setTags} />
                    </div>
                </div>

                {/* Right: Settings / Output */}
                <div className="col-span-3 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                        <h2 className="text-xs font-bold mb-4 text-white/40 uppercase tracking-[0.2em]">Live Prompt</h2>
                        <div className="bg-black/60 p-4 rounded-xl font-mono text-[10px] text-teal-100/80 mb-4 break-words leading-relaxed border border-teal-500/20 shadow-inner h-40 overflow-y-auto custom-scrollbar">
                            {compiledPrompt || "// Prompt is empty..."}
                        </div>
                        <CopyButton text={compiledPrompt} />
                    </div>
                </div>
            </div>
        </div>
    );
};
