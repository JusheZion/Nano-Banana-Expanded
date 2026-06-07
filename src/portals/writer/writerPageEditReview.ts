export type WriterPageEditLayer = 'outline' | 'beats' | 'dialogue';

export type WriterPageEditFindingKind =
  | 'repetition'
  | 'canon_conflict'
  | 'neighbor_overlap'
  | 'layer_mismatch';

export type WriterPageEditAction =
  | 'save_current_layer'
  | 'regenerate_beats'
  | 'regenerate_dialogue'
  | 'run_canon_check'
  | 'revise_manually'
  | 'accept_generated_revision'
  | 'regenerate_affected_pages';

export type WriterPageEditFinding = {
  kind: WriterPageEditFindingKind;
  message: string;
};

export type WriterPageEditReview = {
  layer: WriterPageEditLayer;
  pageNumber: number;
  status: 'clear' | 'needs_review';
  affectedLayers: WriterPageEditLayer[];
  findings: WriterPageEditFinding[];
  actions: WriterPageEditAction[];
};

export type WriterPageEditReviewInput = {
  layer: WriterPageEditLayer;
  pageNumber: number;
  stagedText: string;
  outlineText?: string | null;
  beatsText?: string | null;
  dialogueText?: string | null;
  previousPageText?: string | null;
  nextPageText?: string | null;
  canonText?: string | null;
};

const STOP_WORDS = new Set([
  'and',
  'are',
  'but',
  'for',
  'from',
  'has',
  'into',
  'page',
  'panel',
  'she',
  'that',
  'the',
  'this',
  'with',
]);

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function significantTokens(value: string | null | undefined): string[] {
  return Array.from(new Set(normalizeText(value).split(' ').filter((token) => token.length > 3 && !STOP_WORDS.has(token))));
}

function hasRepeatedPhrase(value: string): boolean {
  const parts = value
    .split(/(?:[A-Z][A-Z0-9 ]{1,24}:|panel\s+\d+:?)/i)
    .map(normalizeText)
    .filter(Boolean);
  return new Set(parts).size < parts.length;
}

function overlapScore(left: string | null | undefined, right: string | null | undefined): number {
  const leftTokens = new Set(significantTokens(left));
  const rightTokens = significantTokens(right);
  if (leftTokens.size === 0 || rightTokens.length === 0) return 0;
  return rightTokens.filter((token) => leftTokens.has(token)).length;
}

function hasCanonDrift(stagedText: string, canonText: string | null | undefined): boolean {
  const canonTokens = significantTokens(canonText);
  if (canonTokens.length === 0) return false;
  const staged = normalizeText(stagedText);
  const hits = canonTokens.filter((token) => staged.includes(token));
  return hits.length <= 1;
}

function layerTextFor(input: WriterPageEditReviewInput, layer: WriterPageEditLayer): string | null | undefined {
  if (layer === 'outline') return input.outlineText;
  if (layer === 'beats') return input.beatsText;
  return input.dialogueText;
}

function affectedLayersFor(layer: WriterPageEditLayer): WriterPageEditLayer[] {
  if (layer === 'outline') return ['outline', 'beats', 'dialogue'];
  if (layer === 'beats') return ['beats', 'dialogue'];
  return ['dialogue'];
}

function clearActionsFor(layer: WriterPageEditLayer): WriterPageEditAction[] {
  if (layer === 'outline') return ['save_current_layer', 'regenerate_beats', 'regenerate_dialogue', 'run_canon_check'];
  if (layer === 'beats') return ['save_current_layer', 'regenerate_dialogue', 'run_canon_check'];
  return ['save_current_layer', 'run_canon_check'];
}

export function buildWriterPageEditReview(input: WriterPageEditReviewInput): WriterPageEditReview {
  const findings: WriterPageEditFinding[] = [];
  const stagedText = input.stagedText.trim();
  const siblingTexts = (['outline', 'beats', 'dialogue'] as const)
    .filter((layer) => layer !== input.layer)
    .map((layer) => layerTextFor(input, layer))
    .filter(Boolean)
    .join('\n');

  if (hasRepeatedPhrase(stagedText)) {
    findings.push({
      kind: 'repetition',
      message: 'The staged edit appears to repeat the same phrase or beat.',
    });
  }
  if (hasCanonDrift(stagedText, input.canonText)) {
    findings.push({
      kind: 'canon_conflict',
      message: 'The staged edit does not reference the available canon terms.',
    });
  }
  if (overlapScore(stagedText, input.previousPageText) >= 3 || overlapScore(stagedText, input.nextPageText) >= 3) {
    findings.push({
      kind: 'neighbor_overlap',
      message: 'The staged edit substantially overlaps an adjacent page.',
    });
  }
  if (siblingTexts && overlapScore(stagedText, siblingTexts) < 3) {
    findings.push({
      kind: 'layer_mismatch',
      message: 'The staged edit does not appear to match the other saved layer(s) for this page.',
    });
  }

  const status = findings.length > 0 ? 'needs_review' : 'clear';
  return {
    layer: input.layer,
    pageNumber: input.pageNumber,
    status,
    affectedLayers: affectedLayersFor(input.layer),
    findings,
    actions:
      status === 'clear'
        ? clearActionsFor(input.layer)
        : ['revise_manually', 'accept_generated_revision', 'regenerate_affected_pages', 'run_canon_check'],
  };
}

export function summarizeWriterPageEditReview(review: WriterPageEditReview): string {
  if (review.status === 'clear') {
    return `No obvious conflicts detected. Affected layers: ${review.affectedLayers.join(', ')}.`;
  }
  return review.findings.map((finding) => finding.message).join(' ');
}
