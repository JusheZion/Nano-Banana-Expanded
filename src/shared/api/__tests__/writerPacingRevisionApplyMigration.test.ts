import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260727000000_writer_pacing_revision_apply_transactions.sql',
), 'utf8');

describe('Pacing Revision Apply transaction migration', () => {
  it('uses authenticated owner-scoped invoker functions with guarded exact transitions', () => {
    expect(sql).toMatch(/security invoker/gi);
    expect(sql).toMatch(/auth\.uid\(\) is null/gi);
    expect(sql).toMatch(/series\.owner_id = auth\.uid\(\)/gi);
    expect(sql).toMatch(/revision_set\.status = 'applying'/);
    expect(sql).toMatch(/revision_set\.status = 'applied'/);
    expect(sql).toMatch(/item\.revision_set_id = p_set_id/gi);
    expect(sql).toMatch(/get diagnostics v_affected_count = row_count/gi);
    expect(sql).toMatch(/v_affected_count <> v_expected_count/gi);
    expect(sql).toMatch(/grant execute .* to authenticated/gi);
    expect(sql).toMatch(/revoke all .* from public/gi);
  });
});
