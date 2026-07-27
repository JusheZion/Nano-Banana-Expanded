import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from },
}));

import { createWriterPage } from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.single.mockResolvedValue({
    data: { id: 'page-planned', issue_id: 'issue-1', page_number: 2 },
    error: null,
  });
  mocks.select.mockReturnValue({ single: mocks.single });
  mocks.insert.mockReturnValue({ select: mocks.select });
  mocks.from.mockReturnValue({ insert: mocks.insert });
});

describe('createWriterPage', () => {
  it('uses a caller-preassigned page id for crash-safe cleanup', async () => {
    await createWriterPage({
      id: 'page-planned',
      issue_id: 'issue-1',
      page_number: 2,
    });

    expect(mocks.insert).toHaveBeenCalledWith({
      id: 'page-planned',
      issue_id: 'issue-1',
      page_number: 2,
    });
  });
});
