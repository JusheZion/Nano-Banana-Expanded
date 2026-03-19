import { describe, expect, it, vi } from 'vitest';
import { pickGenerationSeed } from '../generationSeed';

describe('pickGenerationSeed', () => {
  it('randomized uses Math.random not stored seed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(pickGenerationSeed('randomized', 12345)).toBe(Math.floor(0.5 * 0xffffffff));
    vi.restoreAllMocks();
  });

  it('reuses current when locked', () => {
    expect(pickGenerationSeed('locked', 999)).toBe(999);
  });

  it('locked uses random when current null', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(pickGenerationSeed('locked', null)).toBe(Math.floor(0.1 * 0xffffffff));
    vi.restoreAllMocks();
  });

  it('undefined mode defaults to randomized behavior', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    expect(pickGenerationSeed(undefined, 1)).toBe(Math.floor(0.2 * 0xffffffff));
    vi.restoreAllMocks();
  });
});
