import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme, type Theme } from '@/shared/context/ThemeContext';
import { useResponsiveLayout } from '@/shared/context/ResponsiveLayoutContext';
import { useAuth } from '@/shared/context/AuthContext';
import type { Portal } from '@/shared/portals';
import { ACCENT_GOLD_SOLID, TEXT_ON_BLUE, PRIMARY_BG_FLAT } from '@/shared/theme/Phase12DesignTokens';
import {
  CREATIVE_PORTALS_ORDERED,
  PORTAL_ICON_GLITTER,
  getPortalIcon,
  type PortalCatalogEntry,
} from '@/shared/portalCatalog';
import {
  LANDING_HERO_FALLBACK_URL,
  LANDING_HERO_ROTATION_URLS,
} from '@/shared/landingHeroRotation';

interface LandingPageProps {
  onNavigate?: (portal: Portal) => void;
  onOpenAdvancedComicStudio?: () => void;
}

const HERO_LINE1 = 'ARCS - Assets References Comics & Stories';
const HERO_LINE2 = 'Create stories, images and comics all in one spot!';
const HERO_SUBLINE =
  'Have a story idea? Enter a short summary or synopsis of your story idea, and let our ARCS application guide you through fleshing out your idea for a script or a comic book. Then use our image studios to generate images for illustrating your idea. Then use your images to create a comic book or setup an outline for video generation!';
const VERSION_BADGE = 'v2.4.1';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

function DoorSignInButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex flex-col items-center justify-center rounded-lg border-2 border-amber-200/80 bg-gradient-to-b from-amber-900/40 to-black/50 px-5 py-3 shadow-lg transition hover:border-amber-100 hover:shadow-amber-500/20 disabled:opacity-50 min-w-[88px]"
      style={{ borderColor: `${ACCENT_GOLD_SOLID}cc` }}
      aria-label="Sign in"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-100/90 mb-1">Open</span>
      <span
        className="flex h-14 w-11 items-center justify-center rounded border-2 bg-black/50 font-black text-lg text-amber-300 shadow-inner"
        style={{ borderColor: ACCENT_GOLD_SOLID }}
      >
        IN
      </span>
      <span className="mt-1 h-1 w-8 rounded-full bg-amber-500/50" aria-hidden />
    </button>
  );
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAdvancedComicStudio }) => {
  const { setTheme } = useTheme();
  const { isPhone } = useResponsiveLayout();
  const { user, ready, supabaseConfigured, openSignInModal, signOut } = useAuth();
  const reducedMotion = usePrefersReducedMotion();

  const urls = useMemo(
    () => (LANDING_HERO_ROTATION_URLS.length ? [...LANDING_HERO_ROTATION_URLS] : [LANDING_HERO_FALLBACK_URL]),
    [],
  );
  const [heroIdx, setHeroIdx] = useState(0);
  const [backdropIdx, setBackdropIdx] = useState(1 % urls.length);
  const heroWrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    const t = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % urls.length);
      setBackdropIdx((i) => (i + 1) % urls.length);
    }, 14000);
    return () => window.clearInterval(t);
  }, [urls.length, reducedMotion]);

  const onHeroMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reducedMotion || !heroWrapRef.current) return;
      const r = heroWrapRef.current.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      setTilt({ x: nx * 8, y: ny * 8 });
    },
    [reducedMotion],
  );

  const onHeroLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  const handleCardClick = (portal: Portal, theme: Theme) => {
    setTheme(theme);
    onNavigate?.(portal);
  };

  const visiblePortals: PortalCatalogEntry[] = useMemo(() => {
    if (!isPhone) return CREATIVE_PORTALS_ORDERED;
    return CREATIVE_PORTALS_ORDERED.filter((e) => e.portal !== 'lab' && e.portal !== 'comic');
  }, [isPhone]);

  const heroUrl = urls[heroIdx] ?? LANDING_HERO_FALLBACK_URL;
  const backdropUrl = urls[backdropIdx] ?? LANDING_HERO_FALLBACK_URL;

  return (
    <div className={`relative space-y-8 animate-fade-in pb-20 ${isPhone ? 'p-4' : 'p-8'}`}>
      {/* Full-bleed soft backdrop rotation (landing only) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.22] transition-[background-image] duration-[14s]"
        style={{
          backgroundImage: `url(${backdropUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden
      />
      <div
        className={`pointer-events-none fixed inset-0 -z-[9] bg-gradient-to-br from-[#893741]/25 via-transparent to-[#5F368E]/20 ${
          reducedMotion ? '' : 'animate-landing-aurora'
        }`}
        aria-hidden
      />

      {/* Hero */}
      <div
        ref={heroWrapRef}
        className={`relative rounded-[30px] overflow-hidden group shadow-premium ring-1 ring-white/10 ${
          isPhone ? 'min-h-[16rem]' : 'h-96'
        }`}
        onMouseMove={onHeroMove}
        onMouseLeave={onHeroLeave}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#893741] via-[#0F0F12] to-[#5F368E] opacity-80 z-0" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-overlay transition-transform duration-700 ease-out z-[1]"
          style={{
            backgroundImage: `url(${heroUrl})`,
            transform: reducedMotion ? undefined : `scale(1.06) translate(${tilt.x}px, ${tilt.y}px)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-transparent to-transparent opacity-90 z-[2]" />
        <div className="landing-hero-aurora absolute inset-0 z-[3] pointer-events-none opacity-70" aria-hidden />

        <div className={`relative z-20 h-full flex flex-col justify-end max-w-4xl ${isPhone ? 'p-6' : 'p-12'}`}>
          <div className="inline-flex flex-wrap items-center gap-3 mb-4">
            <div
              className="px-3 py-1 rounded-full backdrop-blur-md border"
              style={{ backgroundColor: `${PRIMARY_BG_FLAT}99`, borderColor: ACCENT_GOLD_SOLID }}
            >
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: TEXT_ON_BLUE }}>
                ARCS
              </span>
            </div>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
              <span className="text-white/60 text-[10px] font-bold tracking-widest uppercase">{VERSION_BADGE}</span>
            </div>
          </div>

          <h1
            className={`font-black text-white mb-3 tracking-tight leading-[1.05] drop-shadow-2xl ${
              isPhone ? 'text-2xl' : 'text-5xl md:text-6xl'
            }`}
          >
            {HERO_LINE1}
          </h1>
          <p
            className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00FFC2] via-white to-[#BF5AF2] mb-4 drop-shadow-lg ${
              isPhone ? 'text-lg' : 'text-2xl md:text-3xl'
            } ${reducedMotion ? '' : 'animate-pulse-slow'}`}
          >
            {HERO_LINE2}
          </p>

          <p
            className={`text-white/75 max-w-3xl leading-relaxed font-light tracking-wide mb-6 ${
              isPhone ? 'text-sm' : 'text-base md:text-lg'
            }`}
          >
            {HERO_SUBLINE}
          </p>

          {supabaseConfigured && ready && !user && (
            <div className="flex flex-wrap items-end gap-4 mb-2">
              <DoorSignInButton onClick={() => openSignInModal({ initialMode: 'signin' })} />
              <button
                type="button"
                onClick={() => openSignInModal({ initialMode: 'signup' })}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur-md hover:bg-white/15"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account strip below hero */}
      {supabaseConfigured && ready && (
        <div className="rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ring-1 ring-white/5">
          <p className="text-xs text-white/55 uppercase tracking-wider font-semibold">Secure Login/Save Your Work</p>
          {user ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-white/90 truncate max-w-[min(100%,280px)]" title={user.email ?? undefined}>
                {user.email ?? 'Signed in'}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-xs font-bold uppercase tracking-wider text-amber-200/90 hover:text-white underline underline-offset-2"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 items-center">
              <DoorSignInButton onClick={() => openSignInModal({ initialMode: 'signin' })} />
              <button
                type="button"
                onClick={() => openSignInModal({ initialMode: 'signup' })}
                className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/20"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      )}

      {!supabaseConfigured || !ready ? (
        <p className="text-center text-xs text-white/45">Account features load when Supabase is configured.</p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visiblePortals.map((entry, i) => (
          <React.Fragment key={entry.portal}>
            <PortalLandingCard
              entry={entry}
              index={i}
              onSelect={handleCardClick}
              reducedMotion={reducedMotion}
            />
            {entry.portal === 'comic' && onOpenAdvancedComicStudio ? (
              <AdvancedComicLandingCard
                index={i + 1}
                onSelect={onOpenAdvancedComicStudio}
                reducedMotion={reducedMotion}
              />
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

function PortalLandingCard({
  entry,
  index,
  onSelect,
  reducedMotion,
}: {
  entry: PortalCatalogEntry;
  index: number;
  onSelect: (p: Portal, t: Theme) => void;
  reducedMotion: boolean;
}) {
  const { portal, theme, cardTitle, cardSubtitle, accentHex, Icon, cardImageUrl } = entry;
  const delay = reducedMotion ? 0 : index * 90;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(portal, theme)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(portal, theme);
        }
      }}
      className={`h-80 relative group cursor-pointer rounded-[24px] overflow-hidden shadow-2xl transition-all duration-500 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
        reducedMotion ? '' : 'animate-landing-card-in'
      }`}
      style={{
        animationDelay: `${delay}ms`,
        borderWidth: 2,
        borderColor: `${accentHex}99`,
        boxShadow: `0 10px 40px -12px ${accentHex}44`,
      }}
    >
      {cardImageUrl ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
            style={{ backgroundImage: `url(${cardImageUrl})` }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-black/30 to-transparent opacity-90 group-hover:opacity-75 transition-opacity"
            style={{ background: `linear-gradient(to top, #0F0F12, ${accentHex}33, transparent)` }}
          />
        </>
      ) : portal === 'wiki' ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a1535] via-[#4a0e3c] to-[#1a0f22] opacity-95 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-transparent to-[#fcf6ba]/10 opacity-75" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d4f4a] via-[#1a7a72] to-[#81D8D0] opacity-95 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-transparent to-[#fcf6ba]/15 opacity-80" />
        </>
      )}

      <div className="absolute bottom-0 left-0 p-6 w-full">
        <div
          className="w-10 h-10 rounded-full border border-white/25 flex items-center justify-center mb-4 shadow-md"
          style={{ background: PORTAL_ICON_GLITTER }}
        >
          <Icon className="w-5 h-5" style={{ color: accentHex }} strokeWidth={2.25} />
        </div>
        <h3 className="text-2xl font-bold text-white mb-1 leading-none">{cardTitle}</h3>
        <p className="text-xs font-medium leading-snug max-w-prose" style={{ color: `${accentHex}ee` }}>
          {cardSubtitle}
        </p>
      </div>
    </div>
  );
}

function AdvancedComicLandingCard({
  index,
  onSelect,
  reducedMotion,
}: {
  index: number;
  onSelect: () => void;
  reducedMotion: boolean;
}) {
  const Icon = getPortalIcon('comic');
  const accentHex = '#60a5fa';
  const delay = reducedMotion ? 0 : index * 90;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`h-80 relative group cursor-pointer rounded-[24px] overflow-hidden shadow-2xl transition-all duration-500 outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 ${
        reducedMotion ? '' : 'animate-landing-card-in'
      }`}
      style={{
        animationDelay: `${delay}ms`,
        borderWidth: 2,
        borderColor: `${accentHex}99`,
        boxShadow: `0 10px 40px -12px ${accentHex}44`,
      }}
      aria-label="Open Advanced Comic Creator workspace"
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: 'url(/assets/images/Aries%20In%20the%20Observatory.jpeg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07111f] via-[#1d4ed8]/45 to-transparent opacity-95 group-hover:opacity-85 transition-opacity" />
      <div className="absolute bottom-0 left-0 p-6 w-full">
        <div
          className="w-10 h-10 rounded-full border border-white/25 flex items-center justify-center mb-4 shadow-md"
          style={{ background: PORTAL_ICON_GLITTER }}
        >
          <Icon className="w-5 h-5" style={{ color: accentHex }} strokeWidth={2.25} />
        </div>
        <h3 className="text-2xl font-bold text-white mb-1 leading-none">Advanced Comic Creator</h3>
        <p className="text-xs font-medium leading-snug max-w-prose" style={{ color: `${accentHex}ee` }}>
          Jump straight into the canvas workspace for panels, lettering, images, layers, and export polish
        </p>
      </div>
    </div>
  );
}
