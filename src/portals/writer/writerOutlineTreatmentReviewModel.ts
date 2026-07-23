import type { IssueOutline, IssueOutlinePageBeat } from '@/shared/writer/types';
import type {
  TreatmentChangeType,
  TreatmentOperationNotice,
  TreatmentProposalSession,
} from './writerOutlineTreatmentValidation';

export type OutlineTreatmentReviewItem = {
  key: string;
  status: 'accepted' | 'rejected' | 'unchanged';
  changeType: string;
  changeLabel: string;
  page: number | null;
  original: IssueOutlinePageBeat | null;
  proposed: IssueOutlinePageBeat | null;
  reason: string;
  technical?: {
    operationId?: string;
    resultBeatId?: string;
    sourceBeatIds: string[];
    code?: string;
  };
};

const CHANGE_LABELS: Record<TreatmentChangeType, string> = {
  unchanged: 'Unchanged',
  language_polished: 'Wording polished',
  moved: 'Page reordered',
  combined: 'Pages combined',
  enhanced: 'Story beat enhanced',
  added: 'New story beat',
};

export function normalizeOutlineReviewText(value = ''): string {
  return value
    .replace(/\\t/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function normalizeBeat(beat: IssueOutlinePageBeat | null | undefined): IssueOutlinePageBeat | null {
  if (!beat) return null;
  return {
    ...beat,
    ...(beat.scene === undefined ? {} : { scene: normalizeOutlineReviewText(beat.scene) }),
    summary: normalizeOutlineReviewText(beat.summary),
    ...(beat.emotional_turn === undefined
      ? {}
      : { emotional_turn: normalizeOutlineReviewText(beat.emotional_turn) }),
  };
}

function proposedBeatFromNotice(
  proposed: TreatmentOperationNotice['proposed'],
  page: number | null,
): IssueOutlinePageBeat | null {
  if (!proposed) return null;
  const hasText = proposed.scene || proposed.summary || proposed.emotional_turn;
  if (!hasText) return null;
  return normalizeBeat({
    ...(page === null ? {} : { page_target: page }),
    ...(proposed.scene === undefined ? {} : { scene: proposed.scene }),
    summary: proposed.summary ?? '',
    ...(proposed.emotional_turn === undefined
      ? {}
      : { emotional_turn: proposed.emotional_turn }),
  });
}

export function buildOutlineTreatmentReviewItems(
  session: TreatmentProposalSession,
): OutlineTreatmentReviewItem[] {
  const sourceById = new Map(session.source.beats.map((beat) => [beat.id, beat]));
  const proposalBeats = ((session.proposal as IssueOutline).page_beats ?? []);
  const proposalById = new Map(
    proposalBeats
      .filter((beat) => beat.treatment_beat_id)
      .map((beat) => [beat.treatment_beat_id!, beat]),
  );

  const manifestItems: OutlineTreatmentReviewItem[] = session.manifest.entries.map((entry) => {
    const firstSource = entry.sourceBeatIds
      .map((sourceId) => sourceById.get(sourceId))
      .find(Boolean);
    const proposed = proposalById.get(entry.resultBeatId) ?? null;
    return {
      key: `manifest-${entry.resultBeatId}`,
      status: entry.changeType === 'unchanged' ? 'unchanged' : 'accepted',
      changeType: entry.changeType,
      changeLabel: CHANGE_LABELS[entry.changeType],
      page: entry.proposedPage ?? firstSource?.pageTarget ?? null,
      original: normalizeBeat(firstSource?.original),
      proposed: normalizeBeat(proposed),
      reason: normalizeOutlineReviewText(entry.reason),
      technical: {
        resultBeatId: entry.resultBeatId,
        sourceBeatIds: entry.sourceBeatIds,
      },
    };
  });

  const rejectedItems: OutlineTreatmentReviewItem[] = (session.operationNotices ?? [])
    .filter((notice) => notice.status === 'rejected')
    .map((notice) => {
      const firstSource = notice.sourceBeatIds
        .map((sourceId) => sourceById.get(sourceId))
        .find(Boolean);
      const page = firstSource?.pageTarget ?? null;
      return {
        key: `notice-${notice.operationId}`,
        status: 'rejected',
        changeType: notice.code,
        changeLabel: 'Change not applied',
        page,
        original: normalizeBeat(firstSource?.original),
        proposed: proposedBeatFromNotice(notice.proposed, page),
        reason: normalizeOutlineReviewText(notice.message),
        technical: {
          operationId: notice.operationId,
          sourceBeatIds: notice.sourceBeatIds,
          code: notice.code,
        },
      };
    });

  const statusOrder = { rejected: 0, accepted: 1, unchanged: 2 } as const;
  return [...manifestItems, ...rejectedItems].sort((left, right) => (
    (left.page ?? Number.MAX_SAFE_INTEGER) - (right.page ?? Number.MAX_SAFE_INTEGER)
    || statusOrder[left.status] - statusOrder[right.status]
    || left.key.localeCompare(right.key)
  ));
}
