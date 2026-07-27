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
  expectation: unknown,
): Promise<{ ok: true } | ApiFailure> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const expectedIds = [...new Set(appliedChangeIds)];
    if (expectedIds.length === 0) {
      return { ok: false, error: 'No approved changes were provided for completion.' };
    }
    const { data, error } = await supabase.rpc('complete_writer_pacing_revision_apply', {
      p_set_id: setId,
      p_change_ids: expectedIds,
      p_snapshot: snapshot,
      p_expectation: expectation,
    });
    if (error) return { ok: false, error: error.message };
    return data === true
      ? { ok: true }
      : { ok: false, error: 'Completion transaction did not confirm success.' };
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
    const { data, error } = await supabase.rpc('reopen_writer_pacing_revision_after_undo', {
      p_set_id: setId,
      p_change_ids: expectedIds,
    });
    if (error) return { ok: false, error: error.message };
    return data === true
      ? { ok: true }
      : { ok: false, error: 'Undo transaction did not confirm success.' };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function recoverWriterPacingRevisionApply(
  setId: string,
  snapshot: unknown,
  detail: string,
  cleanupComplete: boolean,
): Promise<{ ok: true } | ApiFailure> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const normalizedDetail = detail.trim().slice(0, 500) || 'cleanup status unavailable';
    const { data, error } = await supabase
      .from('writer_pacing_revision_sets')
      .update({
        status: cleanupComplete ? 'ready' : 'applying',
        apply_snapshot: snapshot,
        recovery_status: `${cleanupComplete ? 'recovered' : 'recovery_required'}: ${normalizedDetail}`,
      })
      .eq('id', setId)
      .eq('status', 'applying')
      .select('id');
    if (error) return { ok: false, error: error.message };
    return data?.length === 1
      ? { ok: true }
      : { ok: false, error: 'Could not persist the Apply recovery state.' };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function markWriterPacingRevisionRecoveryRequired(
  setId: string,
  expectedStatus: 'applied' | 'applying',
  detail: string,
): Promise<{ ok: true } | ApiFailure> {
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  try {
    const normalizedDetail = detail.trim().slice(0, 500) || 'recovery required';
    const { data, error } = await supabase
      .from('writer_pacing_revision_sets')
      .update({ recovery_status: `recovery_required: ${normalizedDetail}` })
      .eq('id', setId)
      .eq('status', expectedStatus)
      .select('id');
    if (error) return { ok: false, error: error.message };
    return data?.length === 1
      ? { ok: true }
      : { ok: false, error: 'Could not persist the recovery-required state.' };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
