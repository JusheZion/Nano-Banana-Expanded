import {
  CODEX_SCHEMA_VERSION,
  type CodexDocument,
} from '../types/codexObjects';

/**
 * Codex documents persist to localStorage.
 *
 * Deliberately local for now: canon lives in Obsidian and the vault-access
 * question is unsettled, so pushing documents to Supabase would commit to a
 * storage story before that decision is made. The interface below is the seam
 * a remote store would slot into.
 */

const INDEX_KEY = 'codex.documents.v1';
const DOC_PREFIX = 'codex.document.v1.';

export interface CodexDocumentSummary {
  id: string;
  title: string;
  plateCount: number;
  updatedAt: string;
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

function hasFiniteNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

function hasPositiveNumber(value: Record<string, unknown>, key: string): boolean {
  return hasFiniteNumber(value, key) && (value[key] as number) > 0;
}

function isDocumentSummary(value: unknown): value is CodexDocumentSummary {
  return isRecord(value)
    && hasString(value, 'id')
    && hasString(value, 'title')
    && hasString(value, 'updatedAt')
    && hasFiniteNumber(value, 'plateCount');
}

function isCodexObject(value: unknown): boolean {
  if (!isRecord(value)
    || !hasString(value, 'id')
    || !hasString(value, 'kind')
    || !hasFiniteNumber(value, 'x')
    || !hasFiniteNumber(value, 'y')
    || !hasFiniteNumber(value, 'width')
    || !hasFiniteNumber(value, 'height')
    || !hasFiniteNumber(value, 'rotation')
    || !hasFiniteNumber(value, 'opacity')
    || typeof value.locked !== 'boolean'
    || typeof value.visible !== 'boolean') return false;

  switch (value.kind) {
    case 'sigil':
      return hasString(value, 'sigilId') && hasString(value, 'tint');
    case 'text':
      return hasString(value, 'text')
        && hasString(value, 'fontFamily')
        && hasFiniteNumber(value, 'fontSize')
        && hasString(value, 'fontStyle')
        && hasString(value, 'fill')
        && hasString(value, 'align')
        && hasFiniteNumber(value, 'lineHeight')
        && hasFiniteNumber(value, 'letterSpacing');
    case 'frame':
      return hasString(value, 'variant')
        && hasString(value, 'stroke')
        && hasFiniteNumber(value, 'strokeWidth')
        && hasFiniteNumber(value, 'cornerRadius');
    case 'chart':
      return hasString(value, 'chartKind')
        && Array.isArray(value.axes)
        && value.axes.every((axis) => isRecord(axis)
          && hasString(axis, 'label')
          && hasFiniteNumber(axis, 'value'))
        && hasPositiveNumber(value, 'max')
        && (value.segments === undefined
          || (hasPositiveNumber(value, 'segments') && Number.isInteger(value.segments)))
        && hasString(value, 'stroke')
        && hasString(value, 'fill')
        && hasString(value, 'track')
        && hasString(value, 'labelColor')
        && hasString(value, 'fontFamily')
        && hasFiniteNumber(value, 'fontSize')
        && typeof value.showLabels === 'boolean'
        && typeof value.showValues === 'boolean';
    case 'image':
      return hasString(value, 'src');
    default:
      return false;
  }
}

function isCodexDocument(value: unknown): value is CodexDocument {
  return isRecord(value)
    && hasString(value, 'id')
    && hasString(value, 'title')
    && hasString(value, 'createdAt')
    && hasString(value, 'updatedAt')
    && hasFiniteNumber(value, 'schemaVersion')
    && Array.isArray(value.plates)
    && value.plates.length > 0
    && value.plates.every((plate) => isRecord(plate)
      && hasString(plate, 'id')
      && hasString(plate, 'name')
      && hasPositiveNumber(plate, 'width')
      && hasPositiveNumber(plate, 'height')
      && hasString(plate, 'background')
      && Array.isArray(plate.objects)
      && plate.objects.every(isCodexObject));
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function listDocuments(): CodexDocumentSummary[] {
  const store = storage();
  if (!store) return [];
  try {
    const parsed = safeParse(store.getItem(INDEX_KEY));
    const index = Array.isArray(parsed) ? parsed.filter(isDocumentSummary) : [];
    return [...index].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function saveDocument(doc: CodexDocument): CodexDocumentSummary[] | null {
  const store = storage();
  if (!store) return null;

  try {
    const record: CodexDocument = { ...doc, schemaVersion: CODEX_SCHEMA_VERSION };
    store.setItem(DOC_PREFIX + doc.id, JSON.stringify(record));

    const summary: CodexDocumentSummary = {
      id: doc.id,
      title: doc.title,
      plateCount: doc.plates.length,
      updatedAt: doc.updatedAt,
    };
    const index = listDocuments().filter((entry) => entry.id !== doc.id);
    const next = [summary, ...index];
    store.setItem(INDEX_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function loadDocument(id: string): CodexDocument | null {
  const store = storage();
  if (!store) return null;
  try {
    const doc = safeParse(store.getItem(DOC_PREFIX + id));
    if (!isCodexDocument(doc)) return null;
    return migrate(doc);
  } catch {
    return null;
  }
}

export function deleteDocument(id: string): CodexDocumentSummary[] | null {
  const store = storage();
  if (!store) return null;
  try {
    store.removeItem(DOC_PREFIX + id);
    const next = listDocuments().filter((entry) => entry.id !== id);
    store.setItem(INDEX_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

/**
 * Forward-migrate an older saved document. Nothing to do at v1; the hook
 * exists so a schema bump can't silently load a mismatched shape.
 */
export function migrate(doc: CodexDocument): CodexDocument | null {
  if (doc.schemaVersion > CODEX_SCHEMA_VERSION) return null;
  if (doc.schemaVersion === CODEX_SCHEMA_VERSION) return doc;
  return { ...doc, schemaVersion: CODEX_SCHEMA_VERSION };
}

/** JSON export, so a codex can leave the browser and be version-controlled. */
export function serializeDocument(doc: CodexDocument): string {
  return JSON.stringify({ ...doc, schemaVersion: CODEX_SCHEMA_VERSION }, null, 2);
}

export function deserializeDocument(raw: string): CodexDocument | null {
  const parsed = safeParse(raw);
  if (!isCodexDocument(parsed)) return null;
  return migrate(parsed);
}
