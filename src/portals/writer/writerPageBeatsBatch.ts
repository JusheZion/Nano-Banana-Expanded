export type WriterPageBeatsBatchError = {
  page_number: number;
  message: string;
};

export function formatWriterPageBeatsBatchErrors(
  errors: WriterPageBeatsBatchError[],
): string {
  if (errors.length === 0) return '';
  const details = errors
    .map(({ page_number, message }) => `Page ${page_number}: ${message}`)
    .join('\n');
  return `Page Beats stopped because ${errors.length} page${errors.length === 1 ? '' : 's'} could not be generated.\n${details}\nThe completed pages were saved. Retry the failed pages after reviewing the message above.`;
}

export function shouldContinueWriterPageBeatsBatch(args: {
  errors: WriterPageBeatsBatchError[];
  hasMore: boolean;
}): boolean {
  return args.errors.length === 0 && args.hasMore;
}
