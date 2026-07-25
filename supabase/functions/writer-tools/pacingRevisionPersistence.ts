// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export type PacingRevisionPersistenceResult =
  | { ok: true }
  | { ok: false; stage: 'set' | 'children'; error: string };

export async function persistPacingRevisionOutlinePreview(
  supabase: SupabaseClient,
  setRow: Record<string, unknown>,
  itemRows: Array<Record<string, unknown>>,
  changeRows: Array<Record<string, unknown>>,
): Promise<PacingRevisionPersistenceResult> {
  const { error: setError } = await supabase
    .from('writer_pacing_revision_sets')
    .insert(setRow);
  if (setError) return { ok: false, stage: 'set', error: setError.message };

  const { error: itemsError } = await supabase
    .from('writer_pacing_revision_items')
    .insert(itemRows);
  let changesError: { message: string } | null = null;
  if (!itemsError) {
    const result = await supabase
      .from('writer_pacing_revision_changes')
      .insert(changeRows);
    changesError = result.error;
  }
  if (!itemsError && !changesError) return { ok: true };

  await supabase
    .from('writer_pacing_revision_sets')
    .update({ status: 'failed', recovery_status: 'outline_persistence_failed' })
    .eq('id', setRow.id);
  return {
    ok: false,
    stage: 'children',
    error: itemsError?.message ?? changesError?.message ?? 'Unknown persistence error',
  };
}
