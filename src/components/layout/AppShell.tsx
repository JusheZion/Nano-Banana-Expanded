import React, { useState } from 'react';
import { Home, Palette, Image as ImageIcon, Sparkles, Wand2, BookOpen } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

type Portal = 'home' | 'studio' | 'reference' | 'related' | 'lab' | 'comic';

interface AppShellProps {
    children: React.ReactNode;
    activePortal: Portal;
    setActivePortal: (portal: Portal) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activePortal, setActivePortal }) => {
    const { setTheme } = useTheme();
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    const handleNavClick = (portal: Portal) => {
        setActivePortal(portal);
        if (portal === 'studio') setTheme('teal');
        else if (portal === 'reference') setTheme('purple');
        else if (portal === 'comic') setTheme('obsidian');
        else if (portal === 'home') setTheme('crimson');
    };

    const accentFor = (p: Portal) =>
        p === 'studio' ? '#37615D' :
        p === 'reference' ? '#5F368E' :
        p === 'comic' ? '#D4AF37' :
        p === 'lab' ? '#D4AF37' :
        '#893741';

    const NavItem = ({ targetPortal, icon: Icon, label }: { targetPortal: Portal; icon: any; label: string }) => {
        const isActive = activePortal === targetPortal;
        const accent = accentFor(targetPortal);

        return (
            <button
                onClick={() => handleNavClick(targetPortal)}
                title={!sidebarExpanded ? label : undefined}
                className={`
                    w-full flex items-center gap-3 rounded-xl transition-all duration-300 group
                    ${sidebarExpanded ? 'px-4 py-3' : 'px-0 py-3 justify-center'}
                    ${isActive
                        ? `border shadow-[0_0_15px_rgba(212,175,55,0.2)] backdrop-blur-sm`
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}
                `}
                style={isActive ? { color: accent, backgroundColor: `${accent}1a`, borderColor: accent } : undefined}
            >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : 'group-hover:scale-110'} transition-transform`} />
                {sidebarExpanded && <span className="font-medium tracking-wide whitespace-nowrap">{label}</span>}
                {isActive && sidebarExpanded && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full shadow-[0_0_10px_#D4AF37]" style={{ backgroundColor: accent }} />
                )}
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-transparent text-white overflow-hidden text-sm">
            <aside
                onMouseEnter={() => setSidebarExpanded(true)}
                onMouseLeave={() => setSidebarExpanded(false)}
                className={`${sidebarExpanded ? 'w-[230px]' : 'w-[60px]'} flex-shrink-0 flex flex-col z-50 relative transition-all duration-300 ease-in-out`}
                style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '10px 0 30px rgba(0,0,0,0.1)'
                }}
            >
                <div className={`${sidebarExpanded ? 'p-8 pb-6' : 'p-3 pb-4'} relative overflow-hidden transition-all duration-300`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#D4AF37]/10 to-transparent opacity-30 pointer-events-none" />
                    <div className={`flex items-center ${sidebarExpanded ? 'gap-3' : 'justify-center'} mb-1 relative z-10`}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#893741] via-[#D4AF37] to-[#5F368E] flex items-center justify-center shadow-lg ring-1 ring-white/20 shrink-0">
                            <span className="text-white font-bold text-lg drop-shadow-md">N</span>
                        </div>
                        {sidebarExpanded && (
                            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md whitespace-nowrap">
                                Nano <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#893741] to-[#5F368E]">Banana</span>
                            </h1>
                        )}
                    </div>
                    {sidebarExpanded && (
                        <p className="text-[10px] text-[#D4AF37]/80 pl-11 tracking-[0.2em] uppercase font-bold relative z-10">Expansion v2.0</p>
                    )}
                </div>

                <nav className={`flex-1 ${sidebarExpanded ? 'px-4' : 'px-2'} space-y-1 overflow-y-auto custom-scrollbar transition-all duration-300`}>
                    {sidebarExpanded && <div className="text-[10px] font-bold text-white/50 px-4 mb-2 mt-4 uppercase tracking-[0.15em]">Main Hub</div>}
                    {!sidebarExpanded && <div className="h-4 mt-2" />}
                    <NavItem targetPortal="home" icon={Home} label="Overview" />

                    {sidebarExpanded && <div className="text-[10px] font-bold text-white/50 px-4 mb-2 mt-6 uppercase tracking-[0.15em]">Creative Suite</div>}
                    {!sidebarExpanded && <div className="h-3 mt-3 mx-auto w-6 border-t border-white/10" />}
                    <NavItem targetPortal="studio" icon={Wand2} label="Studio" />
                    <NavItem targetPortal="reference" icon={ImageIcon} label="Reference" />
                    <NavItem targetPortal="comic" icon={BookOpen} label="Comic Mode" />
                    <NavItem targetPortal="related" icon={Sparkles} label="Related" />
                    <NavItem targetPortal="lab" icon={Palette} label="Photo Lab" />
                </nav>

                <div className={`${sidebarExpanded ? 'p-6' : 'p-3'} mt-auto flex justify-center relative transition-all duration-300`}>
                    <div className="group relative">
                        <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#37615D] to-[#0F0F12] border border-[#D4AF37]/30 flex items-center justify-center shadow-lg hover:border-[#D4AF37] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                            <span className="text-xs font-bold text-white tracking-widest">JD</span>
                        </button>
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

            <main className="flex-1 relative overflow-hidden flex flex-col h-full">
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
                    {children}
                </div>
            </main>
        </div>
    );
};
