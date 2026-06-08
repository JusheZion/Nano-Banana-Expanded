import { describe, expect, it } from 'vitest';
import { buildWriterRegenerationScope } from '../writerRegenerationScope';

describe('writerRegenerationScope', () => {
  it('describes overwrite and downstream impact in creator language', () => {
    const scope = buildWriterRegenerationScope({
      actionLabel: 'Regenerate page beats',
      targetLabel: 'Page 4 beats',
      overwriteLabels: ['Page 4 beats'],
      downstreamLabels: ['Page 4 dialogue'],
    });

    expect(scope.blocked).toBe(false);
    expect(scope.title).toBe('This will change: Page 4 beats');
    expect(scope.items.map((item) => item.risk)).toEqual(['overwrites', 'safe']);
  });

  it('marks a scope blocked when only locked content would be changed', () => {
    const scope = buildWriterRegenerationScope({
      actionLabel: 'Regenerate selected pages',
      targetLabel: 'selected page beats',
      lockedLabels: ['Page 2 beats'],
    });

    expect(scope.blocked).toBe(true);
    expect(scope.summary).toContain('blocked');
  });
});
