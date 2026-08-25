import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROTECTED_PORTALS } from '@/shared/auth/protectedPortals';

/**
 * Membership in PROTECTED_PORTALS does not gate anything on its own — App.tsx
 * gates by wrapping each portal's render branch in <ProtectedPortalGate>. A
 * portal added to the set but not wrapped stays publicly reachable while
 * looking protected, so assert the two stay in step.
 */
const appSource = readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');

function branchFor(portal: string): string {
  const start = appSource.indexOf(`{activePortal === '${portal}' && (`);
  expect(start, `no render branch for '${portal}' in App.tsx`).toBeGreaterThan(-1);
  const next = appSource.indexOf('{activePortal ===', start + 1);
  return appSource.slice(start, next === -1 ? undefined : next);
}

describe('protected portal wiring', () => {
  it.each(Array.from(PROTECTED_PORTALS))('wraps %s in ProtectedPortalGate', (portal) => {
    expect(branchFor(portal)).toContain('<ProtectedPortalGate>');
  });

  it('leaves public portals ungated', () => {
    for (const portal of ['wiki', 'lore'] as const) {
      expect(branchFor(portal)).not.toContain('<ProtectedPortalGate>');
    }
  });
});
