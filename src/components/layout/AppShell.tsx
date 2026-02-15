import React from 'react';
import { Home, Palette, Image as ImageIcon, Sparkles, Wand2, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface AppShellProps {
    children: React.ReactNode;
    activePortal: 'home' | 'studio' | 'reference' | 'related' | 'lab';
    setActivePortal: (portal: 'home' | 'studio' | 'reference' | 'related' | 'lab') => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activePortal, setActivePortal }) => {
    const { setTheme } = useTheme();

    const handleNavClick = (portal: 'home' | 'studio' | 'reference' | 'related' | 'lab') => {
        setActivePortal(portal);
        // Auto-set theme based on portal
        if (portal === 'studio') setTheme('teal');
        else if (portal === 'reference') setTheme('purple');
        else if (portal === 'home') setTheme('crimson'); // Default/Hub theme
    };

    const NavItem = ({
        targetPortal,
        icon: Icon,
        label
    }: {
        targetPortal: 'home' | 'studio' | 'reference' | 'related' | 'lab',
        icon: any,
        label: string
    }) => {
        const isActive = activePortal === targetPortal;
        const activeColorClass =
            targetPortal === 'studio' ? 'text-[#37615D] bg-[#37615D]/10 border-[#37615D]' :
                targetPortal === 'reference' ? 'text-[#5F368E] bg-[#5F368E]/10 border-[#5F368E]' :
                    'text-[#893741] bg-[#893741]/10 border-[#893741]';

        return (
            <button
                onClick={() => handleNavClick(targetPortal)}
                className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
          ${isActive
                        ? `${activeColorClass} border shadow-lg backdrop-blur-sm`
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}
        `}
            >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                <span className="font-medium tracking-wide">{label}</span>
                {isActive && (
                    <div className={`ml-auto w-1.5 h-1.5 rounded-full ${targetPortal === 'studio' ? 'bg-[#37615D]' :
                        targetPortal === 'reference' ? 'bg-[#5F368E]' :
                            'bg-[#893741]'
                        } shadow-glow`} />
                )}
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-transparent text-white overflow-hidden text-sm">
            {/* Sidebar - High-Fidelity Glassmorphism */}
            <aside
                className="w-64 flex-shrink-0 flex flex-col z-50 relative transition-all duration-300"
                style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* Brand Area */}
                <div className="p-8 pb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#893741] to-[#5F368E] flex items-center justify-center shadow-lg ring-1 ring-white/20">
                            <span className="text-white font-bold text-lg">N</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                            Nano <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#893741] to-[#5F368E]">Banana</span>
                        </h1>
                    </div>
                    <p className="text-[10px] text-white/30 pl-11 tracking-[0.2em] uppercase font-medium">Expansion v2.0</p>
                </div>

                {/* Navigation (Maintains existing logic but cleaner) */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] font-bold text-white/20 px-4 mb-2 mt-4 uppercase tracking-[0.15em]">Main Hub</div>
                    <NavItem targetPortal="home" icon={Home} label="Overview" />

                    <div className="text-[10px] font-bold text-white/20 px-4 mb-2 mt-6 uppercase tracking-[0.15em]">Creative Suite</div>
                    <NavItem targetPortal="studio" icon={Wand2} label="Studio" />
                    <NavItem targetPortal="reference" icon={ImageIcon} label="Reference" />
                    <NavItem targetPortal="related" icon={Sparkles} label="Related" />
                    <NavItem targetPortal="lab" icon={Palette} label="Photo Lab" />
                </nav>

                {/* Profile Avatar & Glass Tooltip */}
                <div className="p-6 mt-auto flex justify-center relative">
                    <div className="group relative">
                        {/* 40px Circular Avatar */}
                        <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#37615D] to-[#0F0F12] border border-white/20 flex items-center justify-center shadow-lg hover:border-white/50 transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(55,97,93,0.4)]">
                            <span className="text-xs font-bold text-white tracking-widest">JD</span>
                        </button>

                        {/* Glass Tooltip (Pops Right/Up) */}
                        <div className="absolute left-14 bottom-0 w-max bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-xl opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out shadow-2xl z-[100]">
                            <p className="text-white font-bold text-sm">John Doe</p>
                            <div className="h-px w-full bg-white/10 my-1" />
                            <p className="text-[#00FFC2] text-[10px] uppercase tracking-wider font-bold">Pro Plan</p>
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
