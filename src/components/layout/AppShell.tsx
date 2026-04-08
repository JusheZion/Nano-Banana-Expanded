import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Palette,
  Image as ImageIcon,
  Wand2,
  BookOpen,
  Box,
  PenLine,
  LogIn,
  BookMarked,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useTheme } from '@/shared/context/ThemeContext';
import { useAuth } from '@/shared/context/AuthContext';
import { useResponsiveLayout } from '@/shared/context/ResponsiveLayoutContext';
import type { Portal } from '@/shared/portals';
import { prefetchPortal } from '@/portals-prefetch';
import {
  PRIMARY_BG_FLAT,
  ACCENT_GOLD_GRADIENT,
  ACCENT_GOLD_SOLID,
  SIDEBAR_JEWEL_GRADIENT,
  WRITERS_NAV_ACCENT,
  WIKI_NAV_ACCENT,
} from '@/shared/theme/Phase12DesignTokens';

interface AppShellProps {
  children: React.ReactNode;
  activePortal: Portal;
  setActivePortal: (portal: Portal) => void;
}

function accentForPortal(p: Portal): string {
  return p === 'studio'
    ? '#37615D'
    : p === 'writer'
      ? WRITERS_NAV_ACCENT
      : p === 'wiki'
        ? WIKI_NAV_ACCENT
        : p === 'reference'
          ? '#5F368E'
          : p === 'assets'
            ? '#5F368E'
            : p === 'comic'
              ? ACCENT_GOLD_SOLID
              : p === 'lab'
                ? ACCENT_GOLD_SOLID
                : p === 'home'
                  ? ACCENT_GOLD_SOLID
                  : '#893741';
}

function initialsForUser(u: User): string {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const name = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      const a = parts[0]?.[0] ?? '';
      const b = parts[1]?.[0] ?? '';
      return (a + b).toUpperCase() || a.toUpperCase() || '?';
  }
  const email = u.email?.trim() ?? '';
  if (!email) return '?';
  return email.slice(0, 2).toUpperCase();
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
      type="button"
      onClick={() => onSelect(targetPortal)}
      onMouseEnter={() => prefetchPortal(targetPortal)}
      title={!sidebarExpanded ? label : undefined}
      aria-label={label}
      className={`
                    w-full flex items-center gap-3 rounded-xl transition-all duration-300 group
                    ${sidebarExpanded ? 'px-4 py-3' : 'px-0 py-3 justify-center'}
                    ${isActive ? 'border backdrop-blur-sm' : 'border border-transparent hover:bg-white/10 active:bg-white/15'}
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

type MobileTabProps = {
  targetPortal: Portal;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onSelect: (portal: Portal) => void;
};

const MobileTab: React.FC<MobileTabProps> = ({ targetPortal, icon: Icon, label, isActive, onSelect }) => {
  const accent = accentForPortal(targetPortal);
  return (
    <button
      type="button"
      onClick={() => onSelect(targetPortal)}
      onMouseEnter={() => prefetchPortal(targetPortal)}
      className={`flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 px-0.5 transition-colors ${
        isActive ? 'bg-white/10' : 'active:bg-white/10'
      }`}
      style={isActive ? { color: accent } : { color: 'rgba(255,255,255,0.72)' }}
      aria-label={label}
    >
      <Icon className="w-5 h-5 shrink-0" aria-hidden />
      <span className="text-[9px] font-bold uppercase tracking-tight truncate max-w-full">{label}</span>
    </button>
  );
};

export const AppShell: React.FC<AppShellProps> = ({ children, activePortal, setActivePortal }) => {
  const { setTheme } = useTheme();
  const { user, ready, supabaseConfigured, openSignInModal, signOut } = useAuth();
  const { isPhone, prefersHoverSidebar } = useResponsiveLayout();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement>(null);
  const mobileHeaderRef = useRef<HTMLElement>(null);
  const moreColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPhone) {
      setSidebarExpanded(false);
      return;
    }
    if (!prefersHoverSidebar) {
      setSidebarExpanded(true);
    }
  }, [isPhone, prefersHoverSidebar]);

  useEffect(() => {
    if (!accountOpen && !moreOpen) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (mobileHeaderRef.current?.contains(t)) return;
      if (accountWrapRef.current?.contains(t)) return;
      if (moreColumnRef.current?.contains(t)) return;
      setAccountOpen(false);
      setMoreOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [accountOpen, moreOpen]);

  const handleNavClick = (portal: Portal) => {
    setActivePortal(portal);
    setMoreOpen(false);
    if (portal === 'studio' || portal === 'writer') setTheme('teal');
    else if (portal === 'reference' || portal === 'assets' || portal === 'lab') setTheme('purple');
    else if (portal === 'comic') setTheme('obsidian');
    else if (portal === 'wiki') setTheme('wiki');
    else if (portal === 'home') setTheme('crimson');
  };

  const accountPanel = (
    <div
      className={`z-[120] min-w-[220px] max-w-[min(92vw,280px)] rounded-xl border p-3 shadow-2xl ring-1 ring-white/5 bg-black/75 backdrop-blur-2xl ${
        isPhone
          ? 'fixed left-3 right-3 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]'
          : 'absolute left-14 bottom-0'
      }`}
      style={{ borderColor: `${ACCENT_GOLD_SOLID}40` }}
    >
      {!supabaseConfigured ? (
        <p className="text-xs text-white/70">Supabase not configured.</p>
      ) : !ready ? (
        <p className="text-xs text-white/60">Loading account…</p>
      ) : user ? (
        <>
          <p className="font-bold text-sm tracking-wide text-white truncate" title={user.email ?? undefined}>
            {user.email ?? 'Signed in'}
          </p>
          <div className="my-2 h-px w-full bg-white/10" />
          <button
            type="button"
            className="w-full rounded-lg py-2 text-left text-xs font-bold uppercase tracking-wider text-white/90 hover:bg-white/10 px-2"
            onClick={() => {
              void signOut();
              setAccountOpen(false);
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <p className="font-bold text-sm tracking-wide text-white">Account</p>
          <p className="mt-1 text-[10px] text-white/60 leading-snug">
            Sign in for Supabase-backed data and AI tools (JWT).
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-lg py-2 text-xs font-bold text-black"
            style={{ background: ACCENT_GOLD_GRADIENT }}
            onClick={() => {
              openSignInModal();
              setAccountOpen(false);
            }}
          >
            Sign in
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="app-safe-x flex h-[100dvh] max-h-[100dvh] min-h-0 bg-transparent text-white overflow-x-hidden max-md:overflow-y-visible md:overflow-hidden text-sm flex-col md:flex-row">
      <aside
        className={`hidden md:flex flex-shrink-0 flex-col z-50 relative transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'w-[230px]' : 'w-[60px]'
        }`}
        style={{
          background: SIDEBAR_JEWEL_GRADIENT,
          borderRight: `1px solid ${PRIMARY_BG_FLAT}`,
          boxShadow: '10px 0 30px rgba(0,0,0,0.2)',
        }}
        onMouseEnter={() => {
          if (!isPhone && prefersHoverSidebar) setSidebarExpanded(true);
        }}
        onMouseLeave={() => {
          if (!isPhone && prefersHoverSidebar) setSidebarExpanded(false);
        }}
      >
        <button
          type="button"
          className={`${sidebarExpanded ? 'p-8 pb-6' : 'p-3 pb-4'} relative overflow-hidden transition-all duration-300 text-left w-full`}
          onClick={() => {
            if (!isPhone && !prefersHoverSidebar) setSidebarExpanded((e) => !e);
          }}
          aria-label={prefersHoverSidebar ? 'ARCS home' : sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-black/10 pointer-events-none" />
          <div className={`flex items-center ${sidebarExpanded ? 'gap-3' : 'justify-center'} mb-1 relative z-10`}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ring-1 ring-white/20 shrink-0"
              style={{ background: ACCENT_GOLD_GRADIENT }}
            >
              <span className="font-bold text-lg drop-shadow-md text-black">A</span>
            </div>
            {sidebarExpanded && (
              <h1 className="text-xl font-bold tracking-tight drop-shadow-md whitespace-nowrap text-white">ARCS</h1>
            )}
            {!prefersHoverSidebar && sidebarExpanded && (
              <ChevronLeft className="w-4 h-4 ml-auto text-white/50 shrink-0" aria-hidden />
            )}
            {!prefersHoverSidebar && !sidebarExpanded && (
              <ChevronRight className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden />
            )}
          </div>
          {sidebarExpanded && (
            <p className="text-[10px] pl-11 tracking-[0.2em] uppercase font-bold relative z-10 opacity-90 text-white/80">
              ARCS Expansion
            </p>
          )}
        </button>

        <nav
          className={`flex-1 ${sidebarExpanded ? 'px-4' : 'px-2'} space-y-1 overflow-y-auto custom-scrollbar transition-all duration-300 text-white/80`}
        >
          {sidebarExpanded && <div className="text-[10px] font-bold px-4 mb-2 mt-4 uppercase tracking-[0.15em] opacity-80">Main Hub</div>}
          {!sidebarExpanded && <div className="h-4 mt-2" />}
          <NavItem
            targetPortal="home"
            icon={Home}
            label="Overview"
            sidebarExpanded={sidebarExpanded}
            isActive={activePortal === 'home'}
            onSelect={handleNavClick}
          />

          {sidebarExpanded && (
            <div className="text-[10px] font-bold px-4 mb-2 mt-4 uppercase tracking-[0.15em] opacity-80">Docs</div>
          )}
          {!sidebarExpanded && <div className="h-3 mt-3 mx-auto w-6 border-t border-white/10" />}
          <NavItem
            targetPortal="wiki"
            icon={BookMarked}
            label="Portals Wiki"
            sidebarExpanded={sidebarExpanded}
            isActive={activePortal === 'wiki'}
            onSelect={handleNavClick}
          />

          {sidebarExpanded && (
            <div className="text-[10px] font-bold px-4 mb-2 mt-6 uppercase tracking-[0.15em] opacity-80">Creative Suite</div>
          )}
          {!sidebarExpanded && <div className="h-3 mt-3 mx-auto w-6 border-t border-white/10" />}
          <NavItem
            targetPortal="studio"
            icon={Wand2}
            label="Reference Character Studio"
            sidebarExpanded={sidebarExpanded}
            isActive={activePortal === 'studio'}
            onSelect={handleNavClick}
          />
          <NavItem
            targetPortal="assets"
            icon={Box}
            label="Assets Studio"
            sidebarExpanded={sidebarExpanded}
            isActive={activePortal === 'assets'}
            onSelect={handleNavClick}
          />
          <NavItem
            targetPortal="reference"
            icon={ImageIcon}
            label="Image Vault"
            sidebarExpanded={sidebarExpanded}
            isActive={activePortal === 'reference'}
            onSelect={handleNavClick}
          />
          <NavItem
            targetPortal="comic"
            icon={BookOpen}
            label="Comic Studio"
            sidebarExpanded={sidebarExpanded}
            isActive={activePortal === 'comic'}
            onSelect={handleNavClick}
          />
          <NavItem
            targetPortal="lab"
            icon={Palette}
            label="Storyline Studio"
            sidebarExpanded={sidebarExpanded}
            isActive={activePortal === 'lab'}
            onSelect={handleNavClick}
          />
          <NavItem
            targetPortal="writer"
            icon={PenLine}
            label={"Writers' Workshop"}
            sidebarExpanded={sidebarExpanded}
            isActive={activePortal === 'writer'}
            onSelect={handleNavClick}
          />
        </nav>

        <div className={`${sidebarExpanded ? 'p-6' : 'p-3'} mt-auto flex justify-center relative transition-all duration-300`}>
          <div className="relative" ref={!isPhone ? accountWrapRef : undefined}>
            {!supabaseConfigured ? (
              <button
                type="button"
                title="Supabase not configured"
                className="w-10 h-10 rounded-full border flex items-center justify-center shadow-lg transition-all duration-300 opacity-70"
                style={{ background: PRIMARY_BG_FLAT, borderColor: `${ACCENT_GOLD_SOLID}80` }}
              >
                <span className="text-[10px] font-bold text-white/80">—</span>
              </button>
            ) : !ready ? (
              <div
                className="w-10 h-10 rounded-full border flex items-center justify-center shadow-lg animate-pulse"
                style={{ background: PRIMARY_BG_FLAT, borderColor: `${ACCENT_GOLD_SOLID}80` }}
                aria-hidden
              />
            ) : user ? (
              <>
                <button
                  type="button"
                  title={user.email ?? 'Signed in'}
                  className="w-10 h-10 rounded-full border flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{ background: PRIMARY_BG_FLAT, borderColor: `${ACCENT_GOLD_SOLID}80` }}
                  onClick={() => setAccountOpen((o) => !o)}
                  aria-expanded={accountOpen}
                >
                  <span className="text-xs font-bold tracking-tight text-white">{initialsForUser(user)}</span>
                </button>
                {accountOpen && !isPhone ? accountPanel : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  title="Sign in"
                  className="w-10 h-10 rounded-full border flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 text-white/90 hover:text-white"
                  style={{ background: PRIMARY_BG_FLAT, borderColor: `${ACCENT_GOLD_SOLID}80` }}
                  aria-expanded={accountOpen}
                >
                  <LogIn className="w-5 h-5" aria-hidden />
                </button>
                {accountOpen && !isPhone ? accountPanel : null}
              </>
            )}
          </div>
        </div>
      </aside>

      <main
        className={`flex-1 relative overflow-hidden flex flex-col h-full min-h-0 w-full min-w-0 ${
          isPhone
            ? 'pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] pt-[calc(max(0.5rem,env(safe-area-inset-top,0px))+3.25rem)]'
            : ''
        }`}
      >
        <div
          className={`flex-1 min-h-0 overflow-x-hidden relative z-0 flex flex-col ${
            activePortal === 'studio' || activePortal === 'assets' || activePortal === 'writer'
              ? 'overflow-y-hidden'
              : 'overflow-y-auto custom-scrollbar'
          }`}
        >
          {children}
        </div>
      </main>

      {isPhone && (
        <>
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/10 bg-black/80 backdrop-blur-xl px-1 pt-1 pl-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))]"
            style={{
              paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))',
            }}
            aria-label="Primary"
          >
            <MobileTab
              targetPortal="home"
              icon={Home}
              label="Home"
              isActive={activePortal === 'home'}
              onSelect={handleNavClick}
            />
            <MobileTab
              targetPortal="writer"
              icon={PenLine}
              label="Writer"
              isActive={activePortal === 'writer'}
              onSelect={handleNavClick}
            />
            <MobileTab
              targetPortal="studio"
              icon={Wand2}
              label="Studio"
              isActive={activePortal === 'studio'}
              onSelect={handleNavClick}
            />
            <MobileTab
              targetPortal="assets"
              icon={Box}
              label="Assets"
              isActive={activePortal === 'assets'}
              onSelect={handleNavClick}
            />
            <MobileTab
              targetPortal="reference"
              icon={ImageIcon}
              label="Vault"
              isActive={activePortal === 'reference'}
              onSelect={handleNavClick}
            />
            <div className="relative flex flex-1 min-w-0 flex-col items-center justify-center" ref={moreColumnRef}>
              <button
                type="button"
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 px-0.5 w-full ${
                  moreOpen ? 'bg-white/10' : ''
                }`}
                style={{ color: moreOpen ? WIKI_NAV_ACCENT : 'rgba(255,255,255,0.72)' }}
                onClick={() => {
                  setAccountOpen(false);
                  setMoreOpen((v) => !v);
                }}
                aria-expanded={moreOpen}
                aria-label="More navigation"
              >
                {moreOpen ? <X className="w-5 h-5" aria-hidden /> : <Menu className="w-5 h-5" aria-hidden />}
                <span className="text-[9px] font-bold uppercase tracking-tight">More</span>
              </button>
              {moreOpen && (
                <div
                  className="fixed left-3 right-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] rounded-xl border bg-black/85 backdrop-blur-2xl p-3 shadow-2xl z-[110] ring-1 ring-white/10"
                  style={{ borderColor: `${ACCENT_GOLD_SOLID}40` }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">Also available</p>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/10"
                    onClick={() => handleNavClick('wiki')}
                    style={{ color: activePortal === 'wiki' ? WIKI_NAV_ACCENT : '#fff' }}
                  >
                    <BookMarked className="w-5 h-5 shrink-0" aria-hidden />
                    Portals Wiki
                  </button>
                  {supabaseConfigured && ready && user ? (
                    <button
                      type="button"
                      className="mt-2 w-full rounded-lg py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white/90 hover:bg-white/10 px-3 border border-white/15"
                      onClick={() => {
                        void signOut();
                        setMoreOpen(false);
                        setAccountOpen(false);
                      }}
                    >
                      Sign out
                    </button>
                  ) : null}
                  <p className="mt-2 text-[9px] text-white/45 leading-snug">
                    Comic Studio and Storyline Studio are optimized for larger screens — use a tablet or desktop.
                  </p>
                </div>
              )}
            </div>
          </nav>
        </>
      )}
      {isPhone && (
        <header
          ref={mobileHeaderRef}
          className="fixed top-0 left-0 right-0 z-[49] isolate flex items-center justify-end gap-2 border-b border-white/5 bg-black/60 pointer-events-auto touch-manipulation"
          style={{
            paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
            paddingBottom: '0.5rem',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
          }}
          aria-label="App"
        >
          <div className="relative" ref={accountWrapRef}>
            {!supabaseConfigured ? (
              <span className="text-[10px] text-white/50">—</span>
            ) : !ready ? (
              <span className="text-[10px] text-white/50">…</span>
            ) : user ? (
              <>
                <button
                  type="button"
                  className="relative z-[1] min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center shadow-md touch-manipulation active:scale-95"
                  style={{ background: PRIMARY_BG_FLAT, borderColor: `${ACCENT_GOLD_SOLID}80` }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setMoreOpen(false);
                    setAccountOpen((o) => !o);
                  }}
                  aria-expanded={accountOpen}
                  aria-label="Account menu"
                >
                  <span className="text-[10px] font-bold text-white">{initialsForUser(user)}</span>
                </button>
                {accountOpen ? accountPanel : null}
              </>
            ) : (
              <button
                type="button"
                className="relative z-[1] min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center shadow-md touch-manipulation active:scale-95 text-white/90"
                style={{ background: PRIMARY_BG_FLAT, borderColor: `${ACCENT_GOLD_SOLID}80` }}
                onClick={() => {
                  setMoreOpen(false);
                  openSignInModal();
                }}
                aria-label="Sign in"
              >
                <LogIn className="w-5 h-5" aria-hidden />
              </button>
            )}
          </div>
        </header>
      )}
    </div>
  );
};
