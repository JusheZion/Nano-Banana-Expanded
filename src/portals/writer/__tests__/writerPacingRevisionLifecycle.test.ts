import { describe, expect, it } from 'vitest';
import { getPacingRevisionReplacementPolicy } from '../writerPacingRevisionLifecycle';

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
      expect(policy.kind === 'confirm_archive' && policy.message.toLowerCase())
        .toContain('archive');
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
});
