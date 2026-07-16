import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResponse = { data: unknown; error: { message: string } | null };

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  responses: [] as QueryResponse[],
  queries: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
}));

function makeQuery(response: QueryResponse) {
  const query = {} as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<QueryResponse>;
  for (const method of ['select', 'insert', 'update', 'eq', 'is', 'not', 'order', 'limit', 'single']) {
    query[method] = vi.fn(() => query);
  }
  query.then = (onfulfilled, onrejected) => Promise.resolve(response).then(onfulfilled, onrejected);
  mocks.queries.push(query);
  return query;
}

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: mocks.from,
  },
}));

import {
  getNextWriterIssueNumber,
  listTrashedWriterIssues,
  listTrashedWriterSeries,
  listWriterIssues,
  listWriterSeries,
  restoreWriterIssue,
  restoreWriterSeries,
  trashWriterIssue,
  trashWriterSeries,
} from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.responses.length = 0;
  mocks.queries.length = 0;
  mocks.from.mockImplementation(() => makeQuery(mocks.responses.shift() ?? { data: [], error: null }));
});

describe('Writers Workshop recoverable trash queries', () => {
  it('filters active series and issues out of Trash', async () => {
    mocks.responses.push({ data: [], error: null }, { data: [], error: null });

    await listWriterSeries();
    await listWriterIssues('series-1');

    expect(mocks.queries[0]?.is).toHaveBeenCalledWith('deleted_at', null);
    expect(mocks.queries[1]?.eq).toHaveBeenCalledWith('series_id', 'series-1');
    expect(mocks.queries[1]?.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('lists only series and issues with a deletion timestamp', async () => {
    mocks.responses.push({ data: [], error: null }, { data: [], error: null });

    await listTrashedWriterSeries();
    await listTrashedWriterIssues();

    expect(mocks.queries[0]?.not).toHaveBeenCalledWith('deleted_at', 'is', null);
    expect(mocks.queries[0]?.order).toHaveBeenCalledWith('deleted_at', { ascending: false });
    expect(mocks.queries[1]?.not).toHaveBeenCalledWith('deleted_at', 'is', null);
    expect(mocks.queries[1]?.order).toHaveBeenCalledWith('deleted_at', { ascending: false });
  });

  it.each([
    ['writer_issues', trashWriterIssue, 'issue-1'],
    ['writer_series', trashWriterSeries, 'series-1'],
  ] as const)('moves a %s row to Trash without deleting it', async (table, operation, id) => {
    mocks.responses.push({ data: null, error: null });

    await expect(operation(id)).resolves.toBe(true);

    expect(mocks.from).toHaveBeenCalledWith(table);
    expect(mocks.queries[0]?.update).toHaveBeenCalledWith(expect.objectContaining({
      deleted_at: expect.any(String),
      updated_at: expect.any(String),
    }));
    expect(mocks.queries[0]?.eq).toHaveBeenCalledWith('id', id);
    expect(mocks.queries[0]?.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it.each([
    ['writer_issues', restoreWriterIssue, 'issue-1'],
    ['writer_series', restoreWriterSeries, 'series-1'],
  ] as const)('restores a trashed %s row', async (table, operation, id) => {
    mocks.responses.push({ data: null, error: null });

    await expect(operation(id)).resolves.toBe(true);

    expect(mocks.from).toHaveBeenCalledWith(table);
    expect(mocks.queries[0]?.update).toHaveBeenCalledWith(expect.objectContaining({
      deleted_at: null,
      updated_at: expect.any(String),
    }));
    expect(mocks.queries[0]?.eq).toHaveBeenCalledWith('id', id);
    expect(mocks.queries[0]?.not).toHaveBeenCalledWith('deleted_at', 'is', null);
  });

  it('allocates after the highest issue number without filtering trashed rows', async () => {
    mocks.responses.push({ data: [{ issue_number: 7 }], error: null });

    await expect(getNextWriterIssueNumber('series-1')).resolves.toBe(8);

    expect(mocks.queries[0]?.eq).toHaveBeenCalledWith('series_id', 'series-1');
    expect(mocks.queries[0]?.order).toHaveBeenCalledWith('issue_number', { ascending: false });
    expect(mocks.queries[0]?.limit).toHaveBeenCalledWith(1);
    expect(mocks.queries[0]?.is).not.toHaveBeenCalled();
    expect(mocks.queries[0]?.not).not.toHaveBeenCalled();
  });
});
