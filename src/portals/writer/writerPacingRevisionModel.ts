import type {
  PacingRevisionChange,
  PacingRevisionSet,
} from '@/shared/writer/pacingRevisionSchemas';

export function effectivePacingRevisionCandidate(change: PacingRevisionChange): unknown {
  return change.edited_candidate ?? change.ai_proposal;
}

export function flattenPacingRevisionChanges(set: PacingRevisionSet): PacingRevisionChange[] {
  return set.items.flatMap((item) => item.changes);
}

export function eligiblePacingRevisionChanges(
  set: PacingRevisionSet,
  options: {
    layer?: PacingRevisionChange['layer'];
    selectedIds?: Set<string>;
  } = {},
): PacingRevisionChange[] {
  return flattenPacingRevisionChanges(set).filter((change) =>
    change.generation_status === 'ready'
    && change.decision !== 'rejected'
    && (!options.layer || change.layer === options.layer)
    && (!options.selectedIds || options.selectedIds.has(change.id))
  );
}

export function pacingRevisionDependencyBlockers(
  change: PacingRevisionChange,
  allChanges: PacingRevisionChange[],
): PacingRevisionChange[] {
  const byId = new Map(allChanges.map((candidate) => [candidate.id, candidate]));
  return change.dependency_ids.flatMap((id) => {
    const dependency = byId.get(id);
    if (!dependency) return [];
    return dependency.decision !== 'approved' && dependency.generation_status !== 'applied'
      ? [dependency]
      : [];
  });
}

export function approvedPacingRevisionChanges(set: PacingRevisionSet): PacingRevisionChange[] {
  const all = flattenPacingRevisionChanges(set);
  return all.filter((change) =>
    change.decision === 'approved'
    && change.generation_status === 'ready'
    && pacingRevisionDependencyBlockers(change, all).length === 0
  );
}
