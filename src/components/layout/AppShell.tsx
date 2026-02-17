import React from 'react';
import { Home, Palette, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface AppShellProps {
    children: React.ReactNode;
    activePortal: 'home' | 'studio' | 'reference' | 'related' | 'lab' | 'comic';
    setActivePortal: (portal: 'home' | 'studio' | 'reference' | 'related' | 'lab' | 'comic') => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activePortal, setActivePortal }) => {
    const { setTheme } = useTheme();

    const handleNavClick = (portal: 'home' | 'studio' | 'reference' | 'related' | 'lab' | 'comic') => {
        setActivePortal(portal);
        // Auto-set theme based on portal
        if (portal === 'studio') setTheme('teal');
        else if (portal === 'reference') setTheme('purple');
        else if (portal === 'comic') setTheme('obsidian');
        else if (portal === 'home') setTheme('crimson'); // Default/Hub theme
    };

    const NavItem = ({
        targetPortal,
        icon: Icon,
        label
    }: {
        targetPortal: 'home' | 'studio' | 'reference' | 'related' | 'lab' | 'comic',
        icon: any,
        label: string
    }) => {
        const isActive = activePortal === targetPortal;
        const activeColorClass =
            targetPortal === 'studio' ? 'text-[#37615D] bg-[#37615D]/10 border-[#37615D]' :
                targetPortal === 'reference' ? 'text-[#5F368E] bg-[#5F368E]/10 border-[#5F368E]' :
                    targetPortal === 'comic' ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]' :
                        'text-[#893741] bg-[#893741]/10 border-[#893741]';

        return (
            <button
                onClick={() => handleNavClick(targetPortal)}
                className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
          ${isActive
                        ? `${activeColorClass} border shadow-[0_0_15px_rgba(212,175,55,0.2)] backdrop-blur-sm`
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}
        `}
            >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : 'group-hover:scale-110'} transition-transform`} />
                <span className="font-medium tracking-wide">{label}</span>
                {isActive && (
                    <div className={`ml-auto w-1.5 h-1.5 rounded-full ${targetPortal === 'studio' ? 'bg-[#37615D]' :
                        targetPortal === 'reference' ? 'bg-[#5F368E]' :
                            targetPortal === 'comic' ? 'bg-[#D4AF37]' :
                                'bg-[#893741]' // Keep original color but add gold glow
                        } shadow-[0_0_10px_#D4AF37]`} />
                )}
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-transparent text-white overflow-hidden text-sm">
            {/* Sidebar - High-Fidelity Glassmorphism */}
            <aside
                className="w-[230px] flex-shrink-0 flex flex-col z-50 relative transition-all duration-300"
                style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '10px 0 30px rgba(0,0,0,0.1)'
                }}
            >
                {/* Brand Area */}
                <div className="p-8 pb-6 relative overflow-hidden">
                    {/* Subtle Gold Glow behind brand */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#D4AF37]/10 to-transparent opacity-30 pointer-events-none" />

                    <div className="flex items-center gap-3 mb-1 relative z-10">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#893741] via-[#D4AF37] to-[#5F368E] flex items-center justify-center shadow-lg ring-1 ring-white/20">
                            <span className="text-white font-bold text-lg drop-shadow-md">N</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                            Nano <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#893741] to-[#5F368E]">Banana</span>
                        </h1>
                    </div>
                    <p className="text-[10px] text-[#D4AF37]/80 pl-11 tracking-[0.2em] uppercase font-bold relative z-10">Expansion v2.0</p>
                </div>

                {/* Navigation (Maintains existing logic but cleaner) */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] font-bold text-white/50 px-4 mb-2 mt-4 uppercase tracking-[0.15em]">Main Hub</div>
                    <NavItem targetPortal="home" icon={Home} label="Overview" />

                    <div className="text-[10px] font-bold text-white/50 px-4 mb-2 mt-6 uppercase tracking-[0.15em]">Creative Suite</div>
                    <NavItem targetPortal="studio" icon={Wand2} label="Studio" />
                    <NavItem targetPortal="reference" icon={ImageIcon} label="Reference" />
                    <NavItem targetPortal="comic" icon={Sparkles} label="Comic Mode" />
                    <NavItem targetPortal="related" icon={Sparkles} label="Related" />
                    <NavItem targetPortal="lab" icon={Palette} label="Photo Lab" />
                </nav>

                {/* Profile Avatar & Glass Tooltip */}
                <div className="p-6 mt-auto flex justify-center relative">
                    <div className="group relative">
                        {/* 40px Circular Avatar */}
                        <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#37615D] to-[#0F0F12] border border-[#D4AF37]/30 flex items-center justify-center shadow-lg hover:border-[#D4AF37] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                            <span className="text-xs font-bold text-white tracking-widest">JD</span>
                        </button>

                        {/* Glass Tooltip (Pops Right/Up) */}
                        <div className="absolute left-14 bottom-0 w-max bg-black/60 backdrop-blur-2xl border border-[#D4AF37]/20 p-3 rounded-xl opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out shadow-2xl z-[100] ring-1 ring-white/5">
                            <p className="text-white font-bold text-sm tracking-wide">John Doe</p>
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent my-2" />
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
                                <p className="text-[#D4AF37] text-[10px] uppercase tracking-wider font-bold">Pro Plan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden flex flex-col h-full">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
                    {children}
                </div>
            </main>
        </div>
    );
};
