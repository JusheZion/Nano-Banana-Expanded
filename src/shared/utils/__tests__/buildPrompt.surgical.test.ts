import { describe, it, expect } from 'vitest';
import { getSurgicalInstructionsFromReferenceSlots } from '../buildPrompt';

describe('getSurgicalInstructionsFromReferenceSlots', () => {
  it('returns character DNA instructions for character context', () => {
    const urls = Array.from({ length: 14 }, () => '');
    urls[0] = 'http://x';
    const out = getSurgicalInstructionsFromReferenceSlots(urls, 'character');
    expect(out.some((s) => s.includes('Character DNA'))).toBe(true);
  });

  it('returns environment coherence for asset context when exterior and interior slots used', () => {
    const urls = Array.from({ length: 14 }, () => '');
    urls[0] = 'a';
    urls[4] = 'b';
    const out = getSurgicalInstructionsFromReferenceSlots(urls, 'asset');
    expect(out.some((s) => s.includes('Site/exterior and interior'))).toBe(true);
  });

  it('does not mention outfits for asset context', () => {
    const urls = Array.from({ length: 14 }, () => '');
    urls[7] = 'm';
    const out = getSurgicalInstructionsFromReferenceSlots(urls, 'asset');
    const joined = out.join(' ');
    expect(joined.toLowerCase()).not.toContain('outfit');
    expect(joined.toLowerCase()).not.toContain('wardrobe');
  });
});
