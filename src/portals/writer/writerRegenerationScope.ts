export type WriterRegenerationScopeItem = {
  label: string;
  change: string;
  risk: 'safe' | 'overwrites' | 'blocked';
};

export type WriterRegenerationScope = {
  title: string;
  summary: string;
  items: WriterRegenerationScopeItem[];
  blocked: boolean;
};

export function buildWriterRegenerationScope(input: {
  actionLabel: string;
  targetLabel: string;
  overwriteLabels?: string[];
  lockedLabels?: string[];
  skippedLabels?: string[];
  downstreamLabels?: string[];
}): WriterRegenerationScope {
  const overwriteLabels = input.overwriteLabels ?? [];
  const lockedLabels = input.lockedLabels ?? [];
  const skippedLabels = input.skippedLabels ?? [];
  const downstreamLabels = input.downstreamLabels ?? [];

  const items: WriterRegenerationScopeItem[] = [
    ...overwriteLabels.map((label) => ({
      label,
      change: 'Will be replaced if this action completes.',
      risk: 'overwrites' as const,
    })),
    ...downstreamLabels.map((label) => ({
      label,
      change: 'May need follow-up review after this action.',
      risk: 'safe' as const,
    })),
    ...skippedLabels.map((label) => ({
      label,
      change: 'Will be skipped.',
      risk: 'safe' as const,
    })),
    ...lockedLabels.map((label) => ({
      label,
      change: 'Locked. This action will not overwrite it.',
      risk: 'blocked' as const,
    })),
  ];

  const blocked = lockedLabels.length > 0 && overwriteLabels.length === 0;
  const overwriteCount = overwriteLabels.length;
  const skipCount = skippedLabels.length + lockedLabels.length;
  const summary = blocked
    ? `${input.actionLabel} is blocked because ${lockedLabels.length} protected item(s) would be overwritten.`
    : `${input.actionLabel} targets ${input.targetLabel}${overwriteCount ? ` and may overwrite ${overwriteCount} item(s)` : ''}${skipCount ? ` while skipping ${skipCount} protected item(s)` : ''}.`;

  return {
    title: `This will change: ${input.targetLabel}`,
    summary,
    items,
    blocked,
  };
}
