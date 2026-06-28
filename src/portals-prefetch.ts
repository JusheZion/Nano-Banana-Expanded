import type { Portal } from '@/shared/portals';

/**
 * Preload a portal's chunk on idle or hover so the first click is fast.
 * Called from AppShell nav item onMouseEnter.
 */
export function prefetchPortal(portal: Portal): void {
  switch (portal) {
    case 'home':
      return; // already in main chunk
    case 'studio':
      void import('./portals/CharacterStudio');
      return;
    case 'assets':
      void import('./portals/AssetsStudio');
      return;
    case 'prompts':
      void import('./portals/prompt-library/PromptLibraryPortal');
      return;
    case 'reference':
      void import('./portals/ReferenceAlbum');
      return;
    case 'lab':
      void import('./portals/PhotoLab');
      return;
    case 'comic':
      void import('./portals/ComicPortal');
      return;
    case 'writer':
      void import('./portals/writer/WriterPortal');
      return;
    case 'wiki':
      void import('./portals/WikiPortal');
      return;
    case 'lore':
      void import('./portals/lore/KitanaLoreDossier');
      return;
  }
}
