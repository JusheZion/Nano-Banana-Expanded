import React, { useState } from 'react';
import { Home, Palette, Image as ImageIcon, Wand2, BookOpen, Box, PenLine } from 'lucide-react';
import { useTheme } from '@/shared/context/ThemeContext';
import type { Portal } from '@/shared/portals';
import { prefetchPortal } from '@/portals-prefetch';
import {
  PRIMARY_BG_FLAT,
  ACCENT_GOLD_GRADIENT,
  ACCENT_GOLD_SOLID,
  SIDEBAR_JEWEL_GRADIENT,
  WRITERS_NAV_ACCENT,
} from '@/shared/theme/Phase12DesignTokens';

interface AppShellProps {
    children: React.ReactNode;
    activePortal: Portal;
    setActivePortal: (portal: Portal) => void;
}

function accentForPortal(p: Portal): string {
    return p === 'studio' ? '#37615D' :
        p === 'writer' ? WRITERS_NAV_ACCENT :
        p === 'reference' ? '#5F368E' :
        p === 'assets' ? '#5F368E' :
        p === 'comic' ? ACCENT_GOLD_SOLID :
        p === 'lab' ? ACCENT_GOLD_SOLID :
        p === 'home' ? ACCENT_GOLD_SOLID :
        '#893741';
}

type NavItemProps = {
    targetPortal: Portal;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    sidebarExpanded: boolean;
    isActive: boolean;
    onSelect: (portal: Portal) => void;
};

const NavItem: React.FC<NavItemProps> = ({
    targetPortal,
    icon: Icon,
    label,
    sidebarExpanded,
    isActive,
    onSelect,
}) => {
    const accent = accentForPortal(targetPortal);

    return (
        <button
            onClick={() => onSelect(targetPortal)}
            onMouseEnter={() => prefetchPortal(targetPortal)}
            title={!sidebarExpanded ? label : undefined}
            className={`
                    w-full flex items-center gap-3 rounded-xl transition-all duration-300 group
                    ${sidebarExpanded ? 'px-4 py-3' : 'px-0 py-3 justify-center'}
                    ${isActive ? 'border backdrop-blur-sm' : 'border border-transparent hover:bg-white/10'}
                `}
            style={isActive ? { color: accent, backgroundColor: `${accent}22`, borderColor: accent } : { color: '#FFFFFF', opacity: 0.9 }}
        >
            <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
            {sidebarExpanded && <span className="font-medium tracking-wide whitespace-nowrap">{label}</span>}
            {isActive && sidebarExpanded && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
            )}
        </button>
    );
};

export const AppShell: React.FC<AppShellProps> = ({ children, activePortal, setActivePortal }) => {
    const { setTheme } = useTheme();
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    const handleNavClick = (portal: Portal) => {
        setActivePortal(portal);
        if (portal === 'studio' || portal === 'writer') setTheme('teal');
        else if (portal === 'reference' || portal === 'assets' || portal === 'lab') setTheme('purple');
        else if (portal === 'comic') setTheme('obsidian');
        else if (portal === 'home') setTheme('crimson');
    };

    return (
        <div className="flex h-screen bg-transparent text-white overflow-hidden text-sm">
            <aside
                onMouseEnter={() => setSidebarExpanded(true)}
                onMouseLeave={() => setSidebarExpanded(false)}
                className={`${sidebarExpanded ? 'w-[230px]' : 'w-[60px]'} flex-shrink-0 flex flex-col z-50 relative transition-all duration-300 ease-in-out`}
                style={{
                    background: SIDEBAR_JEWEL_GRADIENT,
                    borderRight: `1px solid ${PRIMARY_BG_FLAT}`,
                    boxShadow: '10px 0 30px rgba(0,0,0,0.2)',
                }}
            >
                <div className={`${sidebarExpanded ? 'p-8 pb-6' : 'p-3 pb-4'} relative overflow-hidden transition-all duration-300`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-black/10 pointer-events-none" />
                    <div className={`flex items-center ${sidebarExpanded ? 'gap-3' : 'justify-center'} mb-1 relative z-10`}>
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ring-1 ring-white/20 shrink-0"
                            style={{ background: ACCENT_GOLD_GRADIENT }}
                        >
                            <span className="font-bold text-lg drop-shadow-md text-black">A</span>
                        </div>
                        {sidebarExpanded && (
                            <h1 className="text-xl font-bold tracking-tight drop-shadow-md whitespace-nowrap text-white">
                                ARCS
                            </h1>
                        )}
                    </div>
                    {sidebarExpanded && (
                        <p className="text-[10px] pl-11 tracking-[0.2em] uppercase font-bold relative z-10 opacity-90 text-white/80">ARCS Expansion</p>
                    )}
                </div>

                <nav className={`flex-1 ${sidebarExpanded ? 'px-4' : 'px-2'} space-y-1 overflow-y-auto custom-scrollbar transition-all duration-300 text-white/80`}>
                    {sidebarExpanded && <div className="text-[10px] font-bold px-4 mb-2 mt-4 uppercase tracking-[0.15em] opacity-80">Main Hub</div>}
                    {!sidebarExpanded && <div className="h-4 mt-2" />}
                    <NavItem targetPortal="home" icon={Home} label="Overview" sidebarExpanded={sidebarExpanded} isActive={activePortal === 'home'} onSelect={handleNavClick} />

                    {sidebarExpanded && <div className="text-[10px] font-bold px-4 mb-2 mt-6 uppercase tracking-[0.15em] opacity-80">Creative Suite</div>}
                    {!sidebarExpanded && <div className="h-3 mt-3 mx-auto w-6 border-t border-white/10" />}
                    <NavItem targetPortal="studio" icon={Wand2} label="Reference Character Studio" sidebarExpanded={sidebarExpanded} isActive={activePortal === 'studio'} onSelect={handleNavClick} />
                    <NavItem targetPortal="assets" icon={Box} label="Assets Studio" sidebarExpanded={sidebarExpanded} isActive={activePortal === 'assets'} onSelect={handleNavClick} />
                    <NavItem targetPortal="reference" icon={ImageIcon} label="Image Vault" sidebarExpanded={sidebarExpanded} isActive={activePortal === 'reference'} onSelect={handleNavClick} />
                    <NavItem targetPortal="comic" icon={BookOpen} label="Comic Studio" sidebarExpanded={sidebarExpanded} isActive={activePortal === 'comic'} onSelect={handleNavClick} />
                    <NavItem targetPortal="lab" icon={Palette} label="Storyline Studio" sidebarExpanded={sidebarExpanded} isActive={activePortal === 'lab'} onSelect={handleNavClick} />
                    <NavItem targetPortal="writer" icon={PenLine} label={"Writers' Workshop"} sidebarExpanded={sidebarExpanded} isActive={activePortal === 'writer'} onSelect={handleNavClick} />
                </nav>

                <div className={`${sidebarExpanded ? 'p-6' : 'p-3'} mt-auto flex justify-center relative transition-all duration-300`}>
                    <div className="group relative">
                        <button
                            className="w-10 h-10 rounded-full border flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105"
                            style={{ background: PRIMARY_BG_FLAT, borderColor: `${ACCENT_GOLD_SOLID}80` }}
                        >
                            <span className="text-xs font-bold tracking-widest text-white">JD</span>
                        </button>
                        <div className="absolute left-14 bottom-0 w-max bg-black/60 backdrop-blur-2xl border p-3 rounded-xl opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out shadow-2xl z-[100] ring-1 ring-white/5" style={{ borderColor: `${ACCENT_GOLD_SOLID}40` }}>
                            <p className="font-bold text-sm tracking-wide text-white">John Doe</p>
                            <div className="h-px w-full bg-white/10 my-2" />
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full opacity-90" style={{ backgroundColor: ACCENT_GOLD_SOLID }} />
                                <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: ACCENT_GOLD_SOLID }}>Pro Plan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 relative overflow-hidden flex flex-col h-full min-h-0">
                <div
                    className={`flex-1 min-h-0 overflow-x-hidden relative flex flex-col ${
                        activePortal === 'studio' || activePortal === 'assets' || activePortal === 'writer'
                            ? 'overflow-y-hidden'
                            : 'overflow-y-auto custom-scrollbar'
                    }`}
                >
                    {children}
                </div>
            </main>
        </div>
    );
};
