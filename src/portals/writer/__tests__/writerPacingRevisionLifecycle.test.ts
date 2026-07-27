import { describe, expect, it } from 'vitest';
import {
  getPacingRevisionActiveSetForIssue,
  getPacingRevisionReplacementPolicy,
} from '../writerPacingRevisionLifecycle';

const UNFINISHED_ARCHIVE_CONFIRMATION =
  'This Revision Set has unfinished decisions or edits. If the new Pacing Review succeeds, they will move to Revision history. Continue?';

describe('Pacing Revision replacement lifecycle', () => {
  it.each(['applied', 'failed'] as const)(
    'automatically archives a terminal %s set after a successful review',
    (status) => {
      expect(getPacingRevisionReplacementPolicy({ status, generating: false }))
        .toEqual({ kind: 'auto_archive' });
    },
  );

  it.each(['ready', 'partially_ready'] as const)(
    'requires confirmation before replacing an unfinished %s set',
    (status) => {
      const policy = getPacingRevisionReplacementPolicy({ status, generating: false });

      expect(policy.kind).toBe('confirm_archive');
      expect(policy).toEqual({
        kind: 'confirm_archive',
        message: UNFINISHED_ARCHIVE_CONFIRMATION,
      });
    },
  );

  it.each(['applying', 'generating'] as const)(
    'blocks replacement while the set is %s',
    (status) => {
      const policy = getPacingRevisionReplacementPolicy({ status, generating: false });

      expect(policy.kind).toBe('blocked');
      expect(policy.kind === 'blocked' && policy.message.toLowerCase())
        .toContain('wait');
    },
  );

  it('blocks replacement while page candidates are generating', () => {
    expect(getPacingRevisionReplacementPolicy({ status: 'ready', generating: true }))
      .toMatchObject({
        kind: 'blocked',
        message: expect.stringContaining('generating'),
      });
  });

  it('requires no replacement action when no active set exists', () => {
    expect(getPacingRevisionReplacementPolicy({ status: null, generating: false }))
      .toEqual({ kind: 'none' });
  });

  it('does not expose an active set from a different selected issue to policy or archive', () => {
    const staleSet = { issue_id: 'issue-a', status: 'applied' as const };

    expect(getPacingRevisionActiveSetForIssue(staleSet, 'issue-b')).toBeNull();
    expect(getPacingRevisionActiveSetForIssue(staleSet, 'issue-a')).toBe(staleSet);
  });
});
