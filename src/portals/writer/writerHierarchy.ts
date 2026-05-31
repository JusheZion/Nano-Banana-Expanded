export type WriterHierarchyNodeKind =
  | 'arc'
  | 'book'
  | 'issue'
  | 'episode'
  | 'chapter'
  | 'page'
  | 'scene'
  | 'beat';

export type WriterHierarchyNode = {
  id: string;
  kind: WriterHierarchyNodeKind;
  title: string;
  sourceText: string;
  children: WriterHierarchyNode[];
};

export type WriterHierarchyNotesPayload = {
  version: 1;
  source?: string;
  updated_at: string;
  nodes: WriterHierarchyNode[];
};

export type WriterHierarchyNotesOptions = {
  source?: string;
  updatedAt?: string;
};

const NOTES_KEY = 'hierarchy_tree';
const HIERARCHY_VERSION = 1;
const KIND_ORDER: WriterHierarchyNodeKind[] = [
  'arc',
  'book',
  'issue',
  'episode',
  'chapter',
  'page',
  'scene',
  'beat',
];
const KIND_SET = new Set<WriterHierarchyNodeKind>(KIND_ORDER);
const KIND_RANK = new Map<WriterHierarchyNodeKind, number>(KIND_ORDER.map((kind, index) => [kind, index]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readKind(value: unknown): WriterHierarchyNodeKind | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return KIND_SET.has(normalized as WriterHierarchyNodeKind)
    ? (normalized as WriterHierarchyNodeKind)
    : undefined;
}

function kindFromText(text: string, fallback?: WriterHierarchyNodeKind): WriterHierarchyNodeKind {
  const match = text.trim().match(/^(arc|book|issue|episode|chapter|page|scene|beat)\b/i);
  return readKind(match?.[1]) ?? fallback ?? 'beat';
}

function stripMarkdownListMarker(line: string): string {
  return line.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
}

function makeNode(
  kind: WriterHierarchyNodeKind,
  title: string,
  sourceText: string,
  counters: Record<WriterHierarchyNodeKind, number>,
): WriterHierarchyNode {
  counters[kind] += 1;
  return {
    id: `${kind}-${counters[kind]}`,
    kind,
    title,
    sourceText,
    children: [],
  };
}

function attachNode(
  roots: WriterHierarchyNode[],
  stack: Partial<Record<WriterHierarchyNodeKind, WriterHierarchyNode>>,
  node: WriterHierarchyNode,
): void {
  const rank = KIND_RANK.get(node.kind) ?? KIND_ORDER.length;
  const parentKind = [...KIND_ORDER]
    .slice(0, rank)
    .reverse()
    .find((kind) => stack[kind]);
  const parent = parentKind ? stack[parentKind] : undefined;
  if (parent) parent.children.push(node);
  else roots.push(node);

  for (const kind of KIND_ORDER.slice(rank)) {
    delete stack[kind];
  }
  stack[node.kind] = node;
}

function headingFallbackKind(depth: number): WriterHierarchyNodeKind {
  return KIND_ORDER[Math.max(0, Math.min(depth - 1, KIND_ORDER.length - 1))];
}

export function importHierarchyFromText(text: string): WriterHierarchyNode[] {
  const roots: WriterHierarchyNode[] = [];
  const stack: Partial<Record<WriterHierarchyNodeKind, WriterHierarchyNode>> = {};
  const counters = Object.fromEntries(KIND_ORDER.map((kind) => [kind, 0])) as Record<
    WriterHierarchyNodeKind,
    number
  >;

  for (const rawLine of text.split(/\r?\n/)) {
    const sourceText = rawLine.trim();
    if (!sourceText) continue;

    const heading = sourceText.match(/^(#{1,6})\s+(.+)$/);
    const title = heading ? heading[2].trim() : stripMarkdownListMarker(sourceText);
    if (!title) continue;

    const kind = heading
      ? kindFromText(title, headingFallbackKind(heading[1].length))
      : kindFromText(title, sourceText.match(/^[-*+]|\d+[.)]/) ? 'beat' : undefined);
    attachNode(roots, stack, makeNode(kind, title, sourceText, counters));
  }

  return roots;
}

function readJsonChildren(record: Record<string, unknown>): unknown[] {
  const children = record.children ?? record.nodes ?? record.items;
  return Array.isArray(children) ? children : [];
}

function readJsonNodeText(record: Record<string, unknown>): string | undefined {
  return (
    readString(record.title) ??
    readString(record.label) ??
    readString(record.text) ??
    readString(record.name) ??
    readString(record.summary)
  );
}

function normalizeJsonNode(
  value: unknown,
  counters: Record<WriterHierarchyNodeKind, number>,
): WriterHierarchyNode | undefined {
  if (!isRecord(value)) return undefined;

  const kind = readKind(value.kind) ?? readKind(value.type) ?? readKind(value.node_type);
  const title = readJsonNodeText(value);
  if (!kind || !title) return undefined;

  const sourceText = readString(value.sourceText) ?? readString(value.source_text) ?? title;
  const node = makeNode(kind, title, sourceText, counters);
  node.children = readJsonChildren(value)
    .map((child) => normalizeJsonNode(child, counters))
    .filter((child): child is WriterHierarchyNode => Boolean(child));
  return node;
}

function readJsonRoots(input: unknown): unknown[] {
  if (typeof input === 'string') {
    try {
      return readJsonRoots(JSON.parse(input));
    } catch {
      return [];
    }
  }
  if (Array.isArray(input)) return input;
  if (!isRecord(input)) return [];
  const hierarchyTree = input[NOTES_KEY];
  if (isRecord(hierarchyTree)) return readJsonRoots(hierarchyTree.nodes);
  if (Array.isArray(input.nodes)) return input.nodes;
  return [input];
}

export function importHierarchyFromJson(input: unknown): WriterHierarchyNode[] {
  const counters = Object.fromEntries(KIND_ORDER.map((kind) => [kind, 0])) as Record<
    WriterHierarchyNodeKind,
    number
  >;
  return readJsonRoots(input)
    .map((node) => normalizeJsonNode(node, counters))
    .filter((node): node is WriterHierarchyNode => Boolean(node));
}

export function hierarchyToNotesJson(
  nodes: WriterHierarchyNode[],
  options: WriterHierarchyNotesOptions = {},
): Record<string, unknown> {
  return {
    [NOTES_KEY]: {
      version: HIERARCHY_VERSION,
      ...(options.source ? { source: options.source } : {}),
      updated_at: options.updatedAt ?? new Date().toISOString(),
      nodes,
    },
  };
}

export function mergeHierarchyIntoNotes(
  existingNotes: Record<string, unknown>,
  nodes: WriterHierarchyNode[],
  options: WriterHierarchyNotesOptions = {},
): Record<string, unknown> {
  return {
    ...existingNotes,
    ...hierarchyToNotesJson(nodes, options),
  };
}

export function readHierarchyFromNotes(notes: Record<string, unknown> | undefined): WriterHierarchyNode[] {
  if (!notes || typeof notes !== 'object') return [];
  return importHierarchyFromJson({ [NOTES_KEY]: notes[NOTES_KEY] });
}
