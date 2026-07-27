import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WriterToolsRequest } from '@/shared/writer/types';

const {
  getSessionMock,
  refreshSessionMock,
  getUserMock,
  invokeMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  invokeMock: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
      getUser: getUserMock,
    },
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { invokeWriterTools } from '@/shared/api/writerTools';

function base64UrlEncodeJson(payload: unknown): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(payload: { role: string; exp: number; iss?: string }): string {
  const header = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlEncodeJson(payload);
  return `${header}.${body}.signature`;
}

describe('invokeWriterTools token refresh behavior', () => {
  const requestBody: WriterToolsRequest = {
    mode: 'page_beats',
    page_id: '550e8400-e29b-41d4-a716-446655440000',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ error: null });
    invokeMock.mockResolvedValue({
      data: { success: true, mode: 'page_beats', data: { panels: [] } },
      error: null,
    });
  });

  it('does not refresh when the access token is still valid', async () => {
    const now = Math.floor(Date.now() / 1000);
    const freshToken = makeJwt({ role: 'authenticated', exp: now + 3600 });

    getSessionMock.mockResolvedValue({
      data: { session: { access_token: freshToken, refresh_token: 'refresh-token' } },
      error: null,
    });

    const res = await invokeWriterTools(requestBody);

    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect(getUserMock).toHaveBeenCalledWith(freshToken);
    expect(invokeMock).toHaveBeenCalledWith(
      'writer-tools',
      expect.objectContaining({
        body: requestBody,
        headers: { Authorization: `Bearer ${freshToken}` },
      }),
    );
    expect(res.success).toBe(true);
  });

  it('refreshes once when the access token is expired before invoke', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = makeJwt({ role: 'authenticated', exp: now - 120 });
    const refreshedToken = makeJwt({ role: 'authenticated', exp: now + 3600 });

    getSessionMock.mockResolvedValue({
      data: { session: { access_token: expiredToken, refresh_token: 'refresh-token' } },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: refreshedToken, refresh_token: 'refresh-token-2' } },
      error: null,
    });

    const res = await invokeWriterTools(requestBody);

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(getUserMock).toHaveBeenCalledWith(refreshedToken);
    expect(invokeMock).toHaveBeenCalledWith(
      'writer-tools',
      expect.objectContaining({
        body: requestBody,
        headers: { Authorization: `Bearer ${refreshedToken}` },
      }),
    );
    expect(res.success).toBe(true);
  });

  it('sends the preview-only pacing revision mode unchanged', async () => {
    const now = Math.floor(Date.now() / 1000);
    const freshToken = makeJwt({ role: 'authenticated', exp: now + 3600 });
    const body: WriterToolsRequest = {
      mode: 'pacing_revision_outline_preview',
      issue_id: '550e8400-e29b-41d4-a716-446655440000',
    };
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: freshToken, refresh_token: 'refresh-token' } },
      error: null,
    });

    await invokeWriterTools(body);

    expect(invokeMock).toHaveBeenCalledWith(
      'writer-tools',
      expect.objectContaining({ body }),
    );
  });

  it.each([
    {
      target: 'physical',
      pageId: '550e8400-e29b-41d4-a716-446655440001',
      pageNumber: 71,
    },
    {
      target: 'virtual',
      pageId: null,
      pageNumber: 72,
    },
  ])('bounds the one-page pacing revision invocation for a $target target', async ({
    pageId,
    pageNumber,
  }) => {
    const now = Math.floor(Date.now() / 1000);
    const freshToken = makeJwt({ role: 'authenticated', exp: now + 3600 });
    const body: WriterToolsRequest = {
      mode: 'pacing_revision_page_preview',
      revision_set_id: '550e8400-e29b-41d4-a716-446655440000',
      page_id: pageId,
      page_number: pageNumber,
      include_beats: true,
      include_dialogue: false,
    };
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: freshToken, refresh_token: 'refresh-token' } },
      error: null,
    });

    await invokeWriterTools(body);

    expect(invokeMock).toHaveBeenCalledWith(
      'writer-tools',
      expect.objectContaining({ body, timeout: 90_000 }),
    );
  });
});
