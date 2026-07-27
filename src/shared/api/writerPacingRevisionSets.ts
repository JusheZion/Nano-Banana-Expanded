import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';
import {
  pacingRevisionChangeSchema,
  pacingRevisionDecisionPatchSchema,
  pacingRevisionProgressSchema,
  pacingRevisionSetSchema,
  type PacingRevisionChange,
  type PacingRevisionDecisionPatch,
  type PacingRevisionSet,
} from '@/shared/writer/pacingRevisionSchemas';

type ApiFailure = { ok: false; error: string };
type SetsResult = { ok: true; sets: PacingRevisionSet[] } | ApiFailure;
type SetResult = { ok: true; set: PacingRevisionSet } | ApiFailure;
type ChangeResult = { ok: true; change: PacingRevisionChange } | ApiFailure;

const SET_SELECT = `
  *,
  items:writer_pacing_revision_items(
    *,
    changes:writer_pacing_revision_changes(*)
  )
`;

function unavailable(): ApiFailure {
  return { ok: false, error: 'Supabase is not configured.' };
}

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return error instanceof Error ? error.message : String(error);
}

export async function listWriterPacingRevisionSets(issueId: string): Promise<SetsResult> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const { data, error } = await supabase
      .from('writer_pacing_revision_sets')
      .select(SET_SELECT)
      .eq('issue_id', issueId)
      .neq('status', 'discarded')
      .order('created_at', { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, sets: (data ?? []).map((row) => pacingRevisionSetSchema.parse(row)) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function getWriterPacingRevisionSet(setId: string): Promise<SetResult> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const { data, error } = await supabase
      .from('writer_pacing_revision_sets')
      .select(SET_SELECT)
      .eq('id', setId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'Pacing Revision Set not found.' };
    return { ok: true, set: pacingRevisionSetSchema.parse(data) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function updateWriterPacingRevisionChange(
  changeId: string,
  patch: PacingRevisionDecisionPatch,
): Promise<ChangeResult> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  const parsedPatch = pacingRevisionDecisionPatchSchema.parse(patch);
  try {
    const { data, error } = await supabase
      .from('writer_pacing_revision_changes')
      .update(parsedPatch)
      .eq('id', changeId)
      .select('*')
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, change: pacingRevisionChangeSchema.parse(data) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function updateWriterPacingRevisionProgress(
  setId: string,
  progress: unknown,
): Promise<SetResult> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  const progressJson = pacingRevisionProgressSchema.parse(progress);
  try {
    const { data, error } = await supabase
      .from('writer_pacing_revision_sets')
      .update({ progress_json: progressJson })
      .eq('id', setId)
      .select(SET_SELECT)
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, set: pacingRevisionSetSchema.parse(data) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function discardWriterPacingRevisionSet(setId: string): Promise<{ ok: true } | ApiFailure> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const { error } = await supabase
      .from('writer_pacing_revision_sets')
      .update({ status: 'discarded' })
      .eq('id', setId);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

function exactIds(rows: Array<{ id: string }> | null, expectedIds: string[]): boolean {
  const ids = new Set((rows ?? []).map((row) => row.id));
  return ids.size === expectedIds.length && expectedIds.every((id) => ids.has(id));
}

export async function beginWriterPacingRevisionApply(
  setId: string,
  snapshot: unknown,
): Promise<{ ok: true } | ApiFailure> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const { data, error } = await supabase
      .from('writer_pacing_revision_sets')
      .update({
        status: 'applying',
        apply_snapshot: snapshot,
        recovery_status: 'applying',
      })
      .eq('id', setId)
      .in('status', ['ready', 'partially_ready'])
      .select('id');
    if (error) return { ok: false, error: error.message };
    return data?.length === 1
      ? { ok: true }
      : { ok: false, error: 'Could not begin Apply because the Revision Set state changed.' };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function updateWriterPacingRevisionApplySnapshot(
  setId: string,
  snapshot: unknown,
): Promise<{ ok: true } | ApiFailure> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const { data, error } = await supabase
      .from('writer_pacing_revision_sets')
      .update({ apply_snapshot: snapshot, recovery_status: 'applying' })
      .eq('id', setId)
      .eq('status', 'applying')
      .select('id');
    if (error) return { ok: false, error: error.message };
    return data?.length === 1
      ? { ok: true }
      : { ok: false, error: 'Could not persist the applying recovery snapshot.' };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function completeWriterPacingRevisionSet(
  setId: string,
  appliedChangeIds: string[],
  snapshot: unknown,
): Promise<{ ok: true } | ApiFailure> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const expectedIds = [...new Set(appliedChangeIds)];
    if (expectedIds.length === 0) {
      return { ok: false, error: 'No approved changes were provided for completion.' };
    }
    const now = new Date().toISOString();
    const { data: changedRows, error: changesError } = await supabase
      .from('writer_pacing_revision_changes')
      .update({ generation_status: 'applied', applied_at: now })
      .in('id', expectedIds)
      .eq('generation_status', 'ready')
      .select('id');
    if (changesError) return { ok: false, error: changesError.message };
    if (!exactIds(changedRows, expectedIds)) {
      return { ok: false, error: 'Completion did not mark every approved change as applied.' };
    }
    const { data: setRows, error: setError } = await supabase
      .from('writer_pacing_revision_sets')
      .update({ status: 'applied', apply_snapshot: snapshot, recovery_status: null })
      .eq('id', setId)
      .eq('status', 'applying')
      .select('id');
    if (setError || setRows?.length !== 1) {
      const { data: rollbackRows, error: rollbackError } = await supabase
        .from('writer_pacing_revision_changes')
        .update({ generation_status: 'ready', applied_at: null })
        .in('id', expectedIds)
        .eq('generation_status', 'applied')
        .select('id');
      const completionError = setError?.message ?? 'Completion did not update the applying Revision Set.';
      if (rollbackError || !exactIds(rollbackRows, expectedIds)) {
        return {
          ok: false,
          error: `${completionError} Rollback did not restore every change to ready.`,
        };
      }
      return {
        ok: false,
        error: completionError,
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function reopenWriterPacingRevisionSetAfterUndo(
  setId: string,
  appliedChangeIds: string[],
): Promise<{ ok: true } | ApiFailure> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const expectedIds = [...new Set(appliedChangeIds)];
    if (expectedIds.length === 0) {
      return { ok: false, error: 'No applied changes were provided for Undo.' };
    }
    const { data: setRows, error: setError } = await supabase
      .from('writer_pacing_revision_sets')
      .update({ status: 'ready', recovery_status: 'undone' })
      .eq('id', setId)
      .eq('status', 'applied')
      .select('id');
    if (setError) return { ok: false, error: setError.message };
    if (setRows?.length !== 1) {
      return { ok: false, error: 'Undo did not reopen the applied Revision Set.' };
    }
    const { data: changedRows, error: changesError } = await supabase
      .from('writer_pacing_revision_changes')
      .update({ generation_status: 'ready', applied_at: null })
      .in('id', expectedIds)
      .eq('generation_status', 'applied')
      .select('id');
    if (!changesError && exactIds(changedRows, expectedIds)) return { ok: true };

    const { data: compensationRows, error: compensationError } = await supabase
      .from('writer_pacing_revision_sets')
      .update({ status: 'applied', recovery_status: null })
      .eq('id', setId)
      .eq('status', 'ready')
      .select('id');
    const reopenError = changesError?.message ?? 'Undo did not reopen every applied change.';
    if (compensationError || compensationRows?.length !== 1) {
      return {
        ok: false,
        error: `${reopenError} Set compensation back to applied failed.`,
      };
    }
    return { ok: false, error: reopenError };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
