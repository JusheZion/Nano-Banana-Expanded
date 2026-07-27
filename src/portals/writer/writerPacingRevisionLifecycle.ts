import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';

export type PacingRevisionReplacementPolicy =
  | { kind: 'none' }
  | { kind: 'auto_archive' }
  | { kind: 'confirm_archive'; message: string }
  | { kind: 'blocked'; message: string };

export function getPacingRevisionReplacementPolicy(input: {
  status: PacingRevisionSet['status'] | null;
  generating: boolean;
}): PacingRevisionReplacementPolicy {
  if (!input.status) return { kind: 'none' };
  if (input.generating) {
    return {
      kind: 'blocked',
      message: 'Wait for the current Revision Set page candidates to finish generating before running a new Pacing Review.',
    };
  }
  if (input.status === 'generating') {
    return {
      kind: 'blocked',
      message: 'Wait for the current Revision Set to finish generating before running a new Pacing Review.',
    };
  }
  if (input.status === 'applying') {
    return {
      kind: 'blocked',
      message: 'Wait for the current Revision Set to finish applying before running a new Pacing Review.',
    };
  }
  if (input.status === 'ready' || input.status === 'partially_ready') {
    return {
      kind: 'confirm_archive',
      message: 'This Revision Set still has unfinished work. Archive it only if the new Pacing Review succeeds?',
    };
  }
  if (input.status === 'applied' || input.status === 'failed') {
    return { kind: 'auto_archive' };
  }
  return { kind: 'none' };
}
