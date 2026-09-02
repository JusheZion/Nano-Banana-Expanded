export const OBSIDIAN_LORE_TYPE_OPTIONS = [
  'character',
  'species',
  'faction',
  'organization',
  'location',
  'event',
  'discipline',
  'artifact',
  'concept',
] as const;

export type ObsidianLoreDuplicateAction = 'skip' | 'overwrite' | 'merge' | 'create_duplicate';

export type ObsidianLoreExistingEntry = {
  id: string;
  title: string;
  category: string;
  body: string;
  include_in_prompt: boolean;
  sort_order: number;
};

export type ObsidianLoreLink = {
  target: string;
  raw: string;
};

export type ObsidianLoreReference = {
  id?: string;
  title: string;
  category: string;
};

export type ObsidianLoreImageStatus = 'resolved' | 'unresolved' | 'stored';

export type ObsidianLoreImage = {
  reference: string;
  fileName: string;
  sourcePath: string;
  file?: File;
  caption?: string;
  section?: string;
  storageUrl?: string;
  status: ObsidianLoreImageStatus;
};

export type ObsidianLoreEntry = {
  id: string;
  title: string;
  category: string;
  summary: string;
  markdownBody: string;
  properties: Record<string, unknown>;
  tags: string[];
  links: ObsidianLoreLink[];
  linkedLoreReferences: ObsidianLoreReference[];
  images: ObsidianLoreImage[];
  sourcePath: string;
  importDate: string;
  updatedAt: string;
  warnings: string[];
  duplicateOf?: ObsidianLoreExistingEntry;
  duplicateAction: ObsidianLoreDuplicateAction;
};

export type ObsidianLoreImportResult = {
  entries: ObsidianLoreEntry[];
  imageFiles: File[];
  warnings: string[];
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const TITLE_PROPERTIES = ['name', 'title'];
const TYPE_PROPERTIES = ['type', 'category', 'kind'];
const SUMMARY_PROPERTIES = ['summary', 'description'];
const RESERVED_PROPERTIES = new Set([...TITLE_PROPERTIES, ...TYPE_PROPERTIES, ...SUMMARY_PROPERTIES, 'tags']);
const APP_FIELDS_MARKER_RE = /<!--\s*ARCS_LORE_APP_FIELDS[\s\S]*?-->/g;
const LORE_IMPORT_METADATA_RE = /<!--\s*ARCS_LORE_IMPORT_METADATA\s*\n([\s\S]*?)\n-->/;
const LORE_IMPORT_METADATA_GLOBAL_RE = /<!--\s*ARCS_LORE_IMPORT_METADATA\s*\n[\s\S]*?\n-->/g;

export type StoredObsidianLoreMetadata = {
  source: 'obsidian';
  sourcePath: string;
  importDate: string;
  updatedAt: string;
  summary?: string;
  properties?: Record<string, unknown>;
  tags?: string[];
  linkedLoreReferences?: ObsidianLoreReference[];
  images?: Array<Omit<ObsidianLoreImage, 'file'>>;
};

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function getFilePath(file: File): string {
  const p = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return normalizePath(p || file.name);
}

function getExtension(path: string): string {
  const last = path.split('/').pop() ?? path;
  const dot = last.lastIndexOf('.');
  return dot >= 0 ? last.slice(dot + 1).toLowerCase() : '';
}

function removeExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

function basename(path: string): string {
  return normalizePath(path).split('/').pop() ?? path;
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const i = normalized.lastIndexOf('/');
  return i >= 0 ? normalized.slice(0, i) : '';
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseYamlScalar(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((part) => String(parseYamlScalar(part.trim())));
  }
  return trimmed.replace(/^['"]|['"]$/g, '');
}

/**
 * Folds a YAML block scalar into a string.
 *
 * `>` folds line breaks into spaces and blank lines into paragraph breaks;
 * `|` keeps every break. The chomping suffix controls the trailing newline:
 * `-` strips it, `+` keeps them all, bare clips to one.
 */
function foldBlockScalar(lines: string[], style: '>' | '|', chomp: '' | '-' | '+'): string {
  // Indentation is set by the first non-blank line and stripped from all of them.
  const indent = lines.find((l) => l.trim())?.match(/^\s*/)?.[0].length ?? 0;
  const stripped = lines.map((l) => (l.trim() ? l.slice(indent) : ''));

  let text: string;
  if (style === '|') {
    text = stripped.join('\n');
  } else {
    const paragraphs: string[] = [];
    let current: string[] = [];
    for (const line of stripped) {
      if (line.trim()) current.push(line.trim());
      else if (current.length) { paragraphs.push(current.join(' ')); current = []; }
    }
    if (current.length) paragraphs.push(current.join(' '));
    text = paragraphs.join('\n\n');
  }

  if (chomp === '-') return text.replace(/\n+$/, '');
  if (chomp === '+') return text;
  return text.replace(/\n+$/, '\n').replace(/\n$/, '');
}

function parseFrontmatter(markdown: string): { properties: Record<string, unknown>; body: string } {
  const normalized = markdown.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---')) return { properties: {}, body: normalized };
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)([\s\S]*)$/);
  if (!match) return { properties: {}, body: normalized };

  const properties: Record<string, unknown> = {};
  const lines = match[1].split(/\r?\n/);
  let currentArrayKey: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (currentArrayKey && trimmed.startsWith('- ')) {
      const arr = Array.isArray(properties[currentArrayKey]) ? [...(properties[currentArrayKey] as unknown[])] : [];
      arr.push(parseYamlScalar(trimmed.slice(2)));
      properties[currentArrayKey] = arr;
      continue;
    }
    currentArrayKey = null;

    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2] ?? '';

    // Block scalar: `summary: >-` and friends. Everything indented under the
    // key belongs to it, so those lines are consumed here rather than being
    // re-read as malformed keys.
    const block = value.trim().match(/^([|>])([+-]?)\d*$/);
    if (block) {
      const keyIndent = line.match(/^\s*/)?.[0].length ?? 0;
      const collected: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const next = lines[j];
        if (next.trim() && (next.match(/^\s*/)?.[0].length ?? 0) <= keyIndent) break;
        collected.push(next);
      }
      properties[key] = foldBlockScalar(collected, block[1] as '>' | '|', block[2] as '' | '-' | '+');
      i = j - 1;
      continue;
    }

    if (!value.trim()) {
      properties[key] = [];
      currentArrayKey = key;
    } else {
      properties[key] = parseYamlScalar(value);
    }
  }

  return { properties, body: match[2] };
}

function propertyString(properties: Record<string, unknown>, keys: string[]): string {
  const lowerKeyMap = new Map(Object.keys(properties).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actualKey = lowerKeyMap.get(key.toLowerCase()) ?? key;
    const value = properties[actualKey];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function tagsFromProperties(properties: Record<string, unknown>): string[] {
  const tagsKey = Object.keys(properties).find((key) => key.toLowerCase() === 'tags') ?? 'tags';
  const raw = properties[tagsKey];
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,\s]+/) : [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of parts) {
    const tag = String(part).trim().replace(/^#/, '');
    const key = normalizeLookup(tag);
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

function importProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!RESERVED_PROPERTIES.has(key.toLowerCase())) out[key] = value;
  }
  return out;
}

function parseObsidianLinks(body: string): ObsidianLoreLink[] {
  const links: ObsidianLoreLink[] = [];
  const seen = new Set<string>();
  const re = /(?<!!)\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    const raw = match[1].trim();
    const target = raw.split('|')[0].split('#')[0].trim();
    const key = normalizeLookup(target);
    if (!target || seen.has(key)) continue;
    seen.add(key);
    links.push({ target, raw });
  }
  return links;
}

function parseImageReference(raw: string): { reference: string; fileName: string; caption?: string } {
  const [referenceRaw, captionRaw] = raw.split('|');
  const reference = normalizePath(referenceRaw.trim());
  return {
    reference,
    fileName: basename(reference),
    caption: captionRaw?.trim() || undefined,
  };
}

function findNearbyCaption(lines: string[], index: number): string | undefined {
  const candidates = [lines[index + 1], lines[index - 1]];
  for (const candidate of candidates) {
    const t = candidate?.trim();
    if (!t || /^#+\s+/.test(t) || t.includes('![[', 0)) continue;
    return t.replace(/^caption:\s*/i, '').trim();
  }
  return undefined;
}

function parseMarkdownHeading(line: string): string | undefined {
  const heading = line.trim().match(/^#{1,6}\s*(.+)$/);
  const text = heading?.[1]
    ?.replace(/!\[\[[^\]]+\]\]/g, '')
    .trim();
  return text || undefined;
}

function buildImageIndex(files: File[]): Map<string, File> {
  const imageFiles = files.filter((file) => IMAGE_EXTENSIONS.has(getExtension(file.name)));
  const index = new Map<string, File>();
  const basenameCounts = new Map<string, number>();
  for (const file of imageFiles) {
    const filePath = getFilePath(file);
    index.set(normalizePath(filePath).toLowerCase(), file);
    const baseKey = basename(filePath).toLowerCase();
    basenameCounts.set(baseKey, (basenameCounts.get(baseKey) ?? 0) + 1);
  }
  for (const file of imageFiles) {
    const baseKey = basename(getFilePath(file)).toLowerCase();
    if (basenameCounts.get(baseKey) === 1) index.set(baseKey, file);
  }
  return index;
}

function resolveImageFile(ref: string, notePath: string, imageIndex: Map<string, File>): File | undefined {
  const normalizedRef = normalizePath(ref);
  const noteDir = dirname(notePath);
  const candidates = [
    normalizePath(`${noteDir}/${normalizedRef}`).toLowerCase(),
    normalizedRef.toLowerCase(),
    basename(normalizedRef).toLowerCase(),
  ];
  for (const candidate of candidates) {
    const file = imageIndex.get(candidate);
    if (file) return file;
  }

  // Vault-root-relative reference under a *nested* vault.
  //
  // Obsidian resolves `Assets/Images/x.png` from the root of whichever vault
  // the note belongs to, and vaults can be nested — this one has an inner vault
  // inside the outer folder. Rather than guess where the root is, match the
  // reference as a path suffix, and only when exactly one file matches: an
  // ambiguous suffix must stay unresolved rather than silently pick a file.
  const suffix = `/${normalizedRef.toLowerCase()}`;
  let match: File | undefined;
  for (const [key, file] of imageIndex) {
    if (!key.endsWith(suffix)) continue;
    if (match && match !== file) return undefined;
    match = file;
  }
  return match;
}

function parseEmbeddedImages(body: string, notePath: string, imageIndex: Map<string, File>): { images: ObsidianLoreImage[]; warnings: string[] } {
  const images: ObsidianLoreImage[] = [];
  const warnings: string[] = [];
  const lines = body.split(/\r?\n/);
  let section: string | undefined;

  for (let i = 0; i < lines.length; i += 1) {
    const heading = parseMarkdownHeading(lines[i]);
    if (heading) section = heading;

    const re = /!\[\[([^\]]+)\]\]/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(lines[i]))) {
      const parsed = parseImageReference(match[1]);
      const file = resolveImageFile(parsed.reference, notePath, imageIndex);
      const caption = parsed.caption ?? findNearbyCaption(lines, i);
      if (file) {
        images.push({
          ...parsed,
          file,
          sourcePath: getFilePath(file),
          caption,
          section,
          status: 'resolved',
        });
      } else {
        const warning = `Could not resolve embedded image "${parsed.reference}". Select the image file or its containing folder and import again.`;
        images.push({
          ...parsed,
          sourcePath: parsed.reference,
          caption,
          section,
          status: 'unresolved',
        });
        warnings.push(warning);
      }
    }
  }

  return { images, warnings };
}

function matchExistingEntry(title: string, existingEntries: ObsidianLoreExistingEntry[]): ObsidianLoreExistingEntry | undefined {
  const key = normalizeLookup(title);
  return existingEntries.find((entry) => normalizeLookup(entry.title) === key);
}

function shouldSkipVaultMarkdownFile(path: string): boolean {
  const parts = normalizePath(path).split('/').map((part) => part.toLowerCase());
  const base = basename(path).toLowerCase();
  return parts.includes('templates') || base.endsWith(' template.md');
}

function inferCategoryFromPath(path: string): string {
  const parts = normalizePath(path).split('/').map((part) => part.toLowerCase());
  if (parts.includes('characters')) return 'character';
  if (parts.includes('species')) return 'species';
  if (parts.some((part) => part.includes('faction'))) return 'faction';
  if (parts.some((part) => part.includes('organization'))) return 'organization';
  if (parts.includes('locations')) return 'location';
  if (parts.includes('events')) return 'event';
  if (parts.includes('disciplines')) return 'discipline';
  if (parts.includes('artifacts')) return 'artifact';
  if (parts.includes('concepts')) return 'concept';
  return 'concept';
}

function resolveLinkedLoreReferences(
  links: ObsidianLoreLink[],
  existingEntries: ObsidianLoreExistingEntry[],
  importedEntries: Pick<ObsidianLoreEntry, 'title' | 'category'>[],
): ObsidianLoreReference[] {
  const refs: ObsidianLoreReference[] = [];
  const seen = new Set<string>();
  const importedByTitle = new Map(importedEntries.map((entry) => [normalizeLookup(entry.title), entry]));
  const existingByTitle = new Map(existingEntries.map((entry) => [normalizeLookup(entry.title), entry]));

  for (const link of links) {
    const key = normalizeLookup(link.target);
    const existing = existingByTitle.get(key);
    const imported = importedByTitle.get(key);
    const ref = existing
      ? { id: existing.id, title: existing.title, category: existing.category }
      : imported
        ? { title: imported.title, category: imported.category }
        : null;
    if (!ref || seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
  }
  return refs;
}

export async function parseObsidianLoreImport(
  files: File[],
  options: {
    existingEntries?: ObsidianLoreExistingEntry[];
    importDate?: string;
    typeFilter?: string | null;
  } = {},
): Promise<ObsidianLoreImportResult> {
  const importDate = options.importDate ?? new Date().toISOString();
  const existingEntries = options.existingEntries ?? [];
  const typeFilter = options.typeFilter ? normalizeLookup(options.typeFilter) : '';
  const imageFiles = files.filter((file) => IMAGE_EXTENSIONS.has(getExtension(file.name)));
  const imageIndex = buildImageIndex(files);
  const markdownFiles = files.filter((file) => getExtension(file.name) === 'md' || file.type === 'text/markdown');
  const entries: ObsidianLoreEntry[] = [];
  const warnings: string[] = [];

  for (const file of markdownFiles) {
    const sourcePath = getFilePath(file);
    if (shouldSkipVaultMarkdownFile(sourcePath)) continue;
    const text = await file.text();
    const { properties, body } = parseFrontmatter(text);
    const title = propertyString(properties, TITLE_PROPERTIES) || removeExtension(file.name).trim() || 'Untitled lore';
    const category = (propertyString(properties, TYPE_PROPERTIES) || inferCategoryFromPath(sourcePath)).trim().toLowerCase();
    if (typeFilter && normalizeLookup(category) !== typeFilter) continue;
    const summary = propertyString(properties, SUMMARY_PROPERTIES);
    const links = parseObsidianLinks(body);
    const imageResult = parseEmbeddedImages(body, sourcePath, imageIndex);
    warnings.push(...imageResult.warnings);
    const duplicateOf = matchExistingEntry(title, existingEntries);

    entries.push({
      id: `${sourcePath}:${title}`,
      title,
      category,
      summary,
      markdownBody: body.trim(),
      properties: importProperties(properties),
      tags: tagsFromProperties(properties),
      links,
      linkedLoreReferences: [],
      images: imageResult.images,
      sourcePath,
      importDate,
      updatedAt: importDate,
      warnings: imageResult.warnings,
      duplicateOf,
      duplicateAction: duplicateOf ? 'skip' : 'create_duplicate',
    });
  }

  for (const entry of entries) {
    entry.linkedLoreReferences = resolveLinkedLoreReferences(entry.links, existingEntries, entries);
  }

  return { entries, imageFiles, warnings };
}

export function buildLoreBodyFromObsidianEntry(entry: ObsidianLoreEntry, images: ObsidianLoreImage[] = entry.images): string {
  const metadata = {
    source: 'obsidian',
    sourcePath: entry.sourcePath,
    importDate: entry.importDate,
    updatedAt: entry.updatedAt,
    summary: entry.summary,
    properties: entry.properties,
    tags: entry.tags,
    linkedLoreReferences: entry.linkedLoreReferences,
    images: images.map((image) => ({
      reference: image.reference,
      fileName: image.fileName,
      sourcePath: image.sourcePath,
      caption: image.caption,
      section: image.section,
      storageUrl: image.storageUrl,
      status: image.status,
    })),
  };
  const parts = [
    entry.summary ? `> ${entry.summary}` : '',
    entry.markdownBody,
    `<!-- ARCS_LORE_IMPORT_METADATA\n${JSON.stringify(metadata, null, 2)}\n-->`,
  ].filter(Boolean);
  return parts.join('\n\n').trim();
}

export function stripLoreImportMetadataFromBody(body: string): string {
  return body.replace(LORE_IMPORT_METADATA_GLOBAL_RE, '').trim();
}

export function readLoreImportMetadataFromBody(body: string): StoredObsidianLoreMetadata | null {
  const match = body.match(LORE_IMPORT_METADATA_RE);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as Partial<StoredObsidianLoreMetadata>;
    if (parsed.source !== 'obsidian' || typeof parsed.sourcePath !== 'string') return null;
    return {
      source: 'obsidian',
      sourcePath: parsed.sourcePath,
      importDate: typeof parsed.importDate === 'string' ? parsed.importDate : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      properties:
        parsed.properties && typeof parsed.properties === 'object' && !Array.isArray(parsed.properties)
          ? parsed.properties
          : {},
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      linkedLoreReferences: Array.isArray(parsed.linkedLoreReferences) ? parsed.linkedLoreReferences : [],
      images: Array.isArray(parsed.images) ? parsed.images : [],
    };
  } catch {
    return null;
  }
}

export function resolveObsidianLoreDuplicate(args: {
  existing?: ObsidianLoreExistingEntry;
  incoming: {
    title: string;
    category: string;
    body: string;
    include_in_prompt?: boolean;
    sort_order?: number;
  };
  action: ObsidianLoreDuplicateAction;
}):
  | { kind: 'skip' }
  | { kind: 'create'; input: typeof args.incoming }
  | {
      kind: 'update';
      id: string;
      patch: Required<Pick<typeof args.incoming, 'title' | 'category' | 'body'>> & {
        include_in_prompt: boolean;
        sort_order: number;
      };
    } {
  const { existing, incoming, action } = args;
  if (action === 'skip') return { kind: 'skip' };
  if (!existing || action === 'create_duplicate') return { kind: 'create', input: incoming };

  const appFields = action === 'merge' ? existing.body.match(APP_FIELDS_MARKER_RE)?.join('\n\n') : '';
  const mergedBody = [incoming.body.trim(), appFields?.trim()].filter(Boolean).join('\n\n');
  return {
    kind: 'update',
    id: existing.id,
    patch: {
      title: incoming.title,
      category: incoming.category,
      body: action === 'merge' ? mergedBody : incoming.body,
      include_in_prompt: existing.include_in_prompt,
      sort_order: existing.sort_order,
    },
  };
}
