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
    return dependency.decision !== 'approved'
      || !['ready', 'applied'].includes(dependency.generation_status)
      ? [dependency]
      : [];
  });
}

export function pacingRevisionMissingDependencyIds(
  change: PacingRevisionChange,
  allChanges: PacingRevisionChange[],
): string[] {
  const knownIds = new Set(allChanges.map((candidate) => candidate.id));
  return change.dependency_ids.filter((id) => !knownIds.has(id));
}

export function pacingRevisionDependenciesResolved(
  change: PacingRevisionChange,
  allChanges: PacingRevisionChange[],
): boolean {
  return pacingRevisionDependencyBlockers(change, allChanges).length === 0
    && pacingRevisionMissingDependencyIds(change, allChanges).length === 0;
}

export function approvedPacingRevisionChanges(set: PacingRevisionSet): PacingRevisionChange[] {
  const all = flattenPacingRevisionChanges(set);
  return all.filter((change) =>
    change.decision === 'approved'
    && change.generation_status === 'ready'
    && pacingRevisionDependenciesResolved(change, all)
  );
}

export type PacingRevisionLayerSummary = {
  remaining: number;
  ready: number;
  applied: number;
  rejected: number;
};

export function pacingRevisionLayerSummary(
  set: PacingRevisionSet,
  layer: PacingRevisionChange['layer'],
): PacingRevisionLayerSummary {
  const all = flattenPacingRevisionChanges(set);
  const changes = all.filter((change) => change.layer === layer);
  return {
    remaining: changes.filter((change) =>
      change.decision === 'pending' && change.generation_status === 'ready'
    ).length,
    ready: changes.filter((change) =>
      change.decision === 'approved'
      && change.generation_status === 'ready'
      && pacingRevisionDependenciesResolved(change, all)
    ).length,
    applied: changes.filter((change) =>
      change.decision !== 'rejected' && change.generation_status === 'applied'
    ).length,
    rejected: changes.filter((change) => change.decision === 'rejected').length,
  };
}
