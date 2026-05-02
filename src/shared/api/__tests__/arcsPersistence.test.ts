import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterStudioState } from '@/stores/characterStudioStore';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  select: vi.fn(),
  limit: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: () => ({
      select: mocks.select,
      limit: mocks.limit,
      insert: mocks.insert,
    }),
  },
}));

vi.mock('@/shared/utils/semanticId', () => ({
  generateSemanticId: () => 'CHAR_flux_001',
}));

const { saveCharacterToDb } = await import('@/shared/api/arcsPersistence');

function makeCharacterStore(): CharacterStudioState {
  return {
    currentLiveImageUrl: 'https://example.com/flux.png',
    currentGenerationSeed: 42,
    wardrobeSelections: {},
    physicalSelections: {},
    cinematic: {},
    heritageSelection: null,
    genderSelection: null,
    tags: ['Flux'],
    artStyleId: 'default',
    customStyles: [],
  } as unknown as CharacterStudioState;
}

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.select.mockReset();
  mocks.limit.mockReset();
  mocks.insert.mockReset();
  mocks.select.mockReturnValue({ limit: mocks.limit });
  mocks.limit.mockResolvedValue({ data: [], error: null });
  mocks.insert.mockResolvedValue({ error: null });
});

describe('arcsPersistence ownership', () => {
  it('includes owner_id when inserting a character row', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

    const result = await saveCharacterToDb(makeCharacterStore(), 'Flux', 'Flux', 'Flux Briefs');

    expect(result.ok).toBe(true);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'CHAR_flux_001',
      owner_id: 'user-123',
      image_url: 'https://example.com/flux.png',
      profile_name: 'Flux',
      cast_name: 'Flux Briefs',
    }));
  });

  it('returns a sign-in error before insert when no authenticated user exists', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await saveCharacterToDb(makeCharacterStore(), 'Flux', 'Flux');

    expect(result).toEqual({
      ok: false,
      error: 'Sign in to save characters and assets to the cloud vault.',
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
