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
