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

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
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
  const index = safeParse<CodexDocumentSummary[]>(store.getItem(INDEX_KEY)) ?? [];
  return [...index].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveDocument(doc: CodexDocument): CodexDocumentSummary[] {
  const store = storage();
  if (!store) return [];

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
}

export function loadDocument(id: string): CodexDocument | null {
  const store = storage();
  if (!store) return null;
  const doc = safeParse<CodexDocument>(store.getItem(DOC_PREFIX + id));
  if (!doc) return null;
  return migrate(doc);
}

export function deleteDocument(id: string): CodexDocumentSummary[] {
  const store = storage();
  if (!store) return [];
  store.removeItem(DOC_PREFIX + id);
  const next = listDocuments().filter((entry) => entry.id !== id);
  store.setItem(INDEX_KEY, JSON.stringify(next));
  return next;
}

/**
 * Forward-migrate an older saved document. Nothing to do at v1; the hook
 * exists so a schema bump can't silently load a mismatched shape.
 */
export function migrate(doc: CodexDocument): CodexDocument {
  if (doc.schemaVersion === CODEX_SCHEMA_VERSION) return doc;
  return { ...doc, schemaVersion: CODEX_SCHEMA_VERSION };
}

/** JSON export, so a codex can leave the browser and be version-controlled. */
export function serializeDocument(doc: CodexDocument): string {
  return JSON.stringify({ ...doc, schemaVersion: CODEX_SCHEMA_VERSION }, null, 2);
}

export function deserializeDocument(raw: string): CodexDocument | null {
  const parsed = safeParse<CodexDocument>(raw);
  if (!parsed || !Array.isArray(parsed.plates) || typeof parsed.id !== 'string') {
    return null;
  }
  return migrate(parsed);
}
