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
    case 'reference':
      void import('./portals/ReferenceAlbum');
      return;
    case 'related':
      void import('./portals/RelatedAlbum');
      return;
    case 'lab':
      void import('./portals/PhotoLab');
      return;
    case 'comic':
      void import('./portals/ComicPortal');
      return;
  }
}
