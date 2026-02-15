import { useState, useEffect } from 'react';
import { useTheme } from './context/ThemeContext';
import { useProject } from './context/ProjectContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/LandingPage';
import { CharacterStudio } from './portals/CharacterStudio';
import { ReferenceAlbum } from './portals/ReferenceAlbum';
import { RelatedAlbum } from './portals/RelatedAlbum';
import { PhotoLab } from './portals/PhotoLab';

type Portal = 'home' | 'studio' | 'reference' | 'related' | 'lab';

function App() {
  const [activePortal, setActivePortal] = useState<Portal>('home');
  const { setTheme } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { } = useProject();

  useEffect(() => {
    if (activePortal === 'home' || activePortal === 'studio') setTheme('teal');
    else if (activePortal === 'reference' || activePortal === 'related') setTheme('purple');
    else if (activePortal === 'lab') setTheme('gold');
    else setTheme('crimson');
  }, [activePortal, setTheme]);

  return (
    <AppShell activePortal={activePortal} setActivePortal={setActivePortal}>
      {activePortal === 'home' && <LandingPage />}
      {activePortal === 'studio' && (
        <div className="space-y-8">
          <CharacterStudio />
        </div>
      )}
      {activePortal === 'reference' && <ReferenceAlbum />}
      {activePortal === 'related' && <RelatedAlbum />}
      {activePortal === 'lab' && <PhotoLab />}
    </AppShell>
  );
}

export default App;
