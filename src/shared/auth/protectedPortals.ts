import type { Portal } from '@/shared/portals';

export const PROTECTED_PORTALS: ReadonlySet<Portal> = new Set<Portal>([
  'studio',
  'reference',
  'lab',
  'comic',
  'assets',
  'prompts',
  'writer',
]);

export function isProtectedPortal(portal: Portal): boolean {
  return PROTECTED_PORTALS.has(portal);
}
