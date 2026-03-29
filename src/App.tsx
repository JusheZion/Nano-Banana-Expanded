import { useState, useEffect, lazy, Suspense } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { useProject } from '@/shared/context/ProjectContext';
import type { Portal } from '@/shared/portals';
import { useStudioImportBridge } from '@/stores/studioImportBridge';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/LandingPage';

const CharacterStudio = lazy(() => import('./portals/CharacterStudio').then(m => ({ default: m.CharacterStudio })));
const AssetsStudio = lazy(() => import('./portals/AssetsStudio').then(m => ({ default: m.AssetsStudio })));
const ReferenceAlbum = lazy(() => import('./portals/ReferenceAlbum').then(m => ({ default: m.ReferenceAlbum })));
const PhotoLab = lazy(() => import('./portals/PhotoLab').then(m => ({ default: m.PhotoLab })));
const ComicPortal = lazy(() => import('./portals/ComicPortal').then(m => ({ default: m.ComicPortal })));

const PortalFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh] text-white/60">
    <span>Loading…</span>
  </div>
);

function App() {
  const [activePortal, setActivePortal] = useState<Portal>('home');
  const { setTheme } = useTheme();
  useProject();

  const portalToOpen = useStudioImportBridge((s) => s.portalToOpen);
  const clearPortalRequest = useStudioImportBridge((s) => s.clearPortalRequest);

  useEffect(() => {
    if (portalToOpen) {
      setActivePortal(portalToOpen);
      clearPortalRequest();
    }
  }, [portalToOpen, clearPortalRequest]);

  useEffect(() => {
    if (activePortal === 'home' || activePortal === 'studio') setTheme('teal');
    else if (activePortal === 'reference' || activePortal === 'assets') setTheme('purple');
    else if (activePortal === 'lab') setTheme('purple');
    else if (activePortal === 'comic') setTheme('obsidian');
    else setTheme('crimson');
  }, [activePortal, setTheme]);

  return (
    <AppShell activePortal={activePortal} setActivePortal={setActivePortal}>
      {activePortal === 'home' && <LandingPage onNavigate={setActivePortal} />}
      {activePortal === 'studio' && (
        <Suspense fallback={<PortalFallback />}>
          <div className="space-y-8">
            <CharacterStudio />
          </div>
        </Suspense>
      )}
      {activePortal === 'assets' && (
        <Suspense fallback={<PortalFallback />}>
          <AssetsStudio />
        </Suspense>
      )}
      {activePortal === 'reference' && (
        <Suspense fallback={<PortalFallback />}>
          <ReferenceAlbum />
        </Suspense>
      )}
      {activePortal === 'lab' && (
        <Suspense fallback={<PortalFallback />}>
          <PhotoLab />
        </Suspense>
      )}
      {activePortal === 'comic' && (
        <Suspense fallback={<PortalFallback />}>
          <ComicPortal />
        </Suspense>
      )}
    </AppShell>
  );
}

export default App;
