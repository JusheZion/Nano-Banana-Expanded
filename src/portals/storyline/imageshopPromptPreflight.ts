import type { ImageshopPromptWorkspace } from '@/portals/storyline/imageshopPromptComposer';

export type ImageshopPromptPreflightDiagnosticCode =
  | 'weak-prompt'
  | 'configuration-dominant'
  | 'too-many-references'
  | 'reference-payload-too-large'
  | 'reference-timeout-risk'
  | 'reference-fetch-failed'
  | 'missing-reference'
  | 'canon-conflict';

export type ImageshopPromptPreflightDiagnostic = {
  code: ImageshopPromptPreflightDiagnosticCode;
  severity: 'warning' | 'error';
  message: string;
};

export type ImageshopPreflightReference = {
  label: string;
  imageUrl: string;
  signedUrlStatus?: 'unknown' | 'ready' | 'failed';
};

export type ImageshopPromptPayloadHealth = {
  referenceCount: number;
  knownBytes: number;
  readyReferences: number;
  failedReferences: number;
  unknownReferences: number;
  likelyTimeout: boolean;
};

export type ImageshopPromptPreflight = {
  status: 'ready' | 'warning' | 'blocked';
  canGenerate: boolean;
  diagnostics: ImageshopPromptPreflightDiagnostic[];
  payload: ImageshopPromptPayloadHealth;
};

type EvaluateImageshopPromptPreflightInput = {
  composedPrompt: string;
  workspace: ImageshopPromptWorkspace;
  references?: ImageshopPreflightReference[];
  canonConflictCount?: number;
  missingReferenceCount?: number;
};

const MAX_REFERENCE_COUNT = 10;
const REFERENCE_COUNT_WARNING = 8;
const MAX_KNOWN_REFERENCE_BYTES = 8 * 1024 * 1024;
const REFERENCE_BYTES_WARNING = 5 * 1024 * 1024;

function wordCount(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word)).length;
}

function estimateDataUrlBytes(value: string): number {
  const match = value.match(/^data:[^;,]+;base64,(.+)$/i);
  if (!match) return 0;
  const payload = match[1].replace(/\s+/g, '');
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

function addDiagnostic(
  diagnostics: ImageshopPromptPreflightDiagnostic[],
  diagnostic: ImageshopPromptPreflightDiagnostic,
): void {
  if (!diagnostics.some((item) => item.code === diagnostic.code)) diagnostics.push(diagnostic);
}

export function evaluateImageshopPromptPreflight({
  composedPrompt,
  workspace,
  references = [],
  canonConflictCount = 0,
  missingReferenceCount = 0,
}: EvaluateImageshopPromptPreflightInput): ImageshopPromptPreflight {
  const diagnostics: ImageshopPromptPreflightDiagnostic[] = [];
  const semanticText = [
    workspace.main,
    workspace.character,
    workspace.environment,
    workspace.artStyle,
    workspace.camera,
    workspace.continuity,
  ]
    .filter(Boolean)
    .join(' ');
  const semanticWords = wordCount(semanticText);
  const composedWords = wordCount(composedPrompt);

  if (semanticWords < 4) {
    addDiagnostic(diagnostics, {
      code: 'weak-prompt',
      severity: 'error',
      message: 'Add a clear subject, action, setting, or composition before generation.',
    });
  } else if (semanticWords < 8 && composedWords > semanticWords * 3) {
    addDiagnostic(diagnostics, {
      code: 'configuration-dominant',
      severity: 'error',
      message: 'The request is mostly page configuration. Add more visual story direction.',
    });
  }

  const knownBytes = references.reduce(
    (total, reference) => total + estimateDataUrlBytes(reference.imageUrl),
    0,
  );
  const readyReferences = references.filter((reference) => reference.signedUrlStatus === 'ready').length;
  const failedReferences = references.filter((reference) => reference.signedUrlStatus === 'failed').length;
  const unknownReferences = references.length - readyReferences - failedReferences;
  const likelyTimeout =
    references.length > REFERENCE_COUNT_WARNING || knownBytes > REFERENCE_BYTES_WARNING;

  if (references.length > MAX_REFERENCE_COUNT) {
    addDiagnostic(diagnostics, {
      code: 'too-many-references',
      severity: 'error',
      message: `Reduce references to ${MAX_REFERENCE_COUNT} or fewer before generation.`,
    });
  }
  if (knownBytes > MAX_KNOWN_REFERENCE_BYTES) {
    addDiagnostic(diagnostics, {
      code: 'reference-payload-too-large',
      severity: 'error',
      message: 'Known reference data exceeds 8 MB. Remove or resize references before generation.',
    });
  } else if (likelyTimeout) {
    addDiagnostic(diagnostics, {
      code: 'reference-timeout-risk',
      severity: 'warning',
      message: 'The reference payload may be slow or time out.',
    });
  }
  if (failedReferences > 0) {
    addDiagnostic(diagnostics, {
      code: 'reference-fetch-failed',
      severity: 'error',
      message: `${failedReferences} reference${failedReferences === 1 ? '' : 's'} failed URL validation.`,
    });
  }
  if (missingReferenceCount > 0) {
    addDiagnostic(diagnostics, {
      code: 'missing-reference',
      severity: 'error',
      message: `${missingReferenceCount} requested reference${missingReferenceCount === 1 ? '' : 's'} remain unresolved.`,
    });
  }
  if (canonConflictCount > 0) {
    addDiagnostic(diagnostics, {
      code: 'canon-conflict',
      severity: 'error',
      message: `${canonConflictCount} canon conflict${canonConflictCount === 1 ? '' : 's'} must be resolved before generation.`,
    });
  }

  const canGenerate = !diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  const status = canGenerate
    ? diagnostics.some((diagnostic) => diagnostic.severity === 'warning')
      ? 'warning'
      : 'ready'
    : 'blocked';

  return {
    status,
    canGenerate,
    diagnostics,
    payload: {
      referenceCount: references.length,
      knownBytes,
      readyReferences,
      failedReferences,
      unknownReferences,
      likelyTimeout,
    },
  };
}
