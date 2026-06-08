import { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { useProject } from '@/shared/context/ProjectContext';
import { useResponsiveLayout } from '@/shared/context/ResponsiveLayoutContext';
import type { Portal } from '@/shared/portals';
import { useStudioImportBridge } from '@/stores/studioImportBridge';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';
import { usePromptLibraryBridge } from '@/stores/promptLibraryBridge';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/LandingPage';
import { ProtectedPortalGate } from './components/auth/ProtectedPortalGate';
import { isProtectedPortal } from '@/shared/auth/protectedPortals';

const CharacterStudio = lazy(() => import('./portals/CharacterStudio').then(m => ({ default: m.CharacterStudio })));
const AssetsStudio = lazy(() => import('./portals/AssetsStudio').then(m => ({ default: m.AssetsStudio })));
const ReferenceAlbum = lazy(() => import('./portals/ReferenceAlbum').then(m => ({ default: m.ReferenceAlbum })));
const PhotoLab = lazy(() => import('./portals/PhotoLab').then(m => ({ default: m.PhotoLab })));
const ComicPortal = lazy(() => import('./portals/ComicPortal').then(m => ({ default: m.ComicPortal })));
const WriterPortal = lazy(() => import('./portals/writer/WriterPortal').then(m => ({ default: m.WriterPortal })));
const WikiPortal = lazy(() => import('./portals/WikiPortal').then(m => ({ default: m.WikiPortal })));
const PromptLibraryPortal = lazy(() => import('./portals/prompt-library/PromptLibraryPortal').then(m => ({ default: m.PromptLibraryPortal })));

const PortalFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh] text-white/60">
    <span>Loading…</span>
  </div>
);

function App() {
  const [activePortal, setActivePortal] = useState<Portal>('home');
  const [advancedComicRequestKey, setAdvancedComicRequestKey] = useState(0);
  const [wikiJumpNonce, setWikiJumpNonce] = useState(0);
  const [wikiJump, setWikiJump] = useState<{ chapterId: string; headingId?: string } | null>(null);
  const { setTheme } = useTheme();
  const { isPhone } = useResponsiveLayout();
  useProject();

  const portalToOpen = useStudioImportBridge((s) => s.portalToOpen);
  const clearPortalRequest = useStudioImportBridge((s) => s.clearPortalRequest);
  const imageWorkshopPortalToOpen = useImageWorkshopBridge((s) => s.portalToOpen);
  const clearImageWorkshopPortalRequest = useImageWorkshopBridge((s) => s.clearPortalRequest);
  const guidedComicVaultPortalToOpen = useGuidedComicVaultBridge((s) => s.portalToOpen);
  const clearGuidedComicVaultPortalRequest = useGuidedComicVaultBridge((s) => s.clearPortalRequest);
  const promptLibraryPortalToOpen = usePromptLibraryBridge((s) => s.portalToOpen);
  const clearPromptLibraryPortalRequest = usePromptLibraryBridge((s) => s.clearPortalRequest);
  const isPhoneRef = useRef(isPhone);
  isPhoneRef.current = isPhone;

  const navigatePortal = useCallback((p: Portal) => {
    const phone = isPhoneRef.current;
    if (phone && (p === 'comic' || p === 'lab')) {
      setActivePortal('home');
      return;
    }
    if (p === 'wiki') setWikiJump(null);
    setActivePortal(p);
  }, []);

  const requestPortalsWiki = useCallback((opts: { chapterId: string; headingId?: string }) => {
    setWikiJump(opts);
    setWikiJumpNonce((n) => n + 1);
    setActivePortal('wiki');
  }, []);

  const openAdvancedComicStudio = useCallback(() => {
    if (isPhoneRef.current) {
      setActivePortal('home');
      return;
    }
    setAdvancedComicRequestKey((key) => key + 1);
    setActivePortal('comic');
  }, []);

  useEffect(() => {
    if (portalToOpen) {
      navigatePortal(portalToOpen);
      clearPortalRequest();
    }
  }, [portalToOpen, clearPortalRequest, navigatePortal]);

  useEffect(() => {
    if (imageWorkshopPortalToOpen) {
      navigatePortal(imageWorkshopPortalToOpen);
      clearImageWorkshopPortalRequest();
    }
  }, [imageWorkshopPortalToOpen, clearImageWorkshopPortalRequest, navigatePortal]);

  useEffect(() => {
    if (guidedComicVaultPortalToOpen) {
      navigatePortal(guidedComicVaultPortalToOpen);
      clearGuidedComicVaultPortalRequest();
    }
  }, [guidedComicVaultPortalToOpen, clearGuidedComicVaultPortalRequest, navigatePortal]);

  useEffect(() => {
    if (promptLibraryPortalToOpen) {
      navigatePortal(promptLibraryPortalToOpen);
      clearPromptLibraryPortalRequest();
    }
  }, [promptLibraryPortalToOpen, clearPromptLibraryPortalRequest, navigatePortal]);

  useEffect(() => {
    if (isPhone && (activePortal === 'comic' || activePortal === 'lab')) {
      setActivePortal('home');
    }
  }, [isPhone, activePortal]);

  useEffect(() => {
    if (activePortal === 'home' || activePortal === 'studio') setTheme('teal');
    else if (activePortal === 'reference' || activePortal === 'assets') setTheme('purple');
    else if (activePortal === 'lab') setTheme('purple');
    else if (activePortal === 'comic') setTheme('obsidian');
    else if (activePortal === 'prompts') setTheme('gold');
    else if (activePortal === 'writer') setTheme('teal');
    else if (activePortal === 'wiki') setTheme('wiki');
    else setTheme('crimson');
  }, [activePortal, setTheme]);

  return (
    <AppShell
      activePortal={activePortal}
      setActivePortal={navigatePortal}
      onOpenAdvancedComicStudio={openAdvancedComicStudio}
    >
      {activePortal === 'home' && !isProtectedPortal(activePortal) && (
        <LandingPage onNavigate={navigatePortal} onOpenAdvancedComicStudio={openAdvancedComicStudio} />
      )}
      {activePortal === 'studio' && (
        <ProtectedPortalGate>
          <Suspense fallback={<PortalFallback />}>
            <div className="h-full min-h-0 flex flex-col overflow-hidden">
              <CharacterStudio />
            </div>
          </Suspense>
        </ProtectedPortalGate>
      )}
      {activePortal === 'assets' && (
        <ProtectedPortalGate>
          <Suspense fallback={<PortalFallback />}>
            <div className="h-full min-h-0 flex flex-col overflow-hidden">
              <AssetsStudio />
            </div>
          </Suspense>
        </ProtectedPortalGate>
      )}
      {activePortal === 'reference' && (
        <ProtectedPortalGate>
          <Suspense fallback={<PortalFallback />}>
            <ReferenceAlbum />
          </Suspense>
        </ProtectedPortalGate>
      )}
      {activePortal === 'lab' && (
        <ProtectedPortalGate>
          <Suspense fallback={<PortalFallback />}>
            <PhotoLab />
          </Suspense>
        </ProtectedPortalGate>
      )}
      {activePortal === 'prompts' && (
        <ProtectedPortalGate>
          <Suspense fallback={<PortalFallback />}>
            <div className="h-full min-h-0 flex flex-col overflow-hidden">
              <PromptLibraryPortal />
            </div>
          </Suspense>
        </ProtectedPortalGate>
      )}
      {activePortal === 'comic' && (
        <ProtectedPortalGate>
          <Suspense fallback={<PortalFallback />}>
            <ComicPortal onNavigatePortal={navigatePortal} advancedStudioRequestKey={advancedComicRequestKey} />
          </Suspense>
        </ProtectedPortalGate>
      )}
      {activePortal === 'writer' && (
        <ProtectedPortalGate>
          <Suspense fallback={<PortalFallback />}>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full">
              <WriterPortal onRequestPortalsWiki={requestPortalsWiki} />
            </div>
          </Suspense>
        </ProtectedPortalGate>
      )}
      {activePortal === 'wiki' && (
        <Suspense fallback={<PortalFallback />}>
          <WikiPortal jumpNonce={wikiJumpNonce} jump={wikiJump} onNavigatePortal={navigatePortal} />
        </Suspense>
      )}
    </AppShell>
  );
}

export default App;
