/**
 * Resolving codex objects against parsed Obsidian notes.
 *
 * Kept pure and separate from `vaultAccess`: reading the vault needs a browser
 * and a user grant, whereas deciding what a bound object should say is plain
 * data in and data out, and is where the mistakes would be.
 */
import type { ObsidianLoreEntry } from '@/portals/writer/obsidianLoreImport';
import type { CodexBinding, CodexObject } from '../types/codexObjects';
import { findImage, imageUrl } from './vaultImages';

/** Fields every note exposes, before its own frontmatter. */
export const CORE_FIELDS = ['title', 'category', 'summary', 'body', 'tags'] as const;

/**
 * Renders a note's markdown body as prose for a plate.
 *
 * The body is the one field that is authored as markdown rather than as a
 * value, and a codex plate has no markdown renderer — dropping it in raw would
 * print `## Origins` and `[[Kaleid]]` on the page. This strips the syntax and
 * keeps the words, which is what someone binding a body to a text box means.
 */
export function plainTextFromMarkdown(markdown: string): string {
  return markdown
    // Embedded images and files carry no prose.
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Wikilinks: keep the display text after a pipe, else the target.
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    // Markdown links: keep the label.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Block syntax at the start of a line.
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    // Horizontal rules leave a stray line behind.
    .replace(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '')
    // Fences and inline code markers; the code itself stays.
    .replace(/^\s*```.*$/gm, '')
    .replace(/`([^`]*)`/g, '$1')
    // Emphasis, innermost first so ***both*** unwraps cleanly.
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    // Collapse the blank lines the stripping leaves behind.
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Every field this note can be bound to. Derived from the note rather than
 * hardcoded, so a vault with its own frontmatter conventions works without the
 * app being taught them.
 */
export function bindableFields(entry: ObsidianLoreEntry): string[] {
  const props = Object.keys(entry.properties ?? {})
    .filter((key) => key.trim().length > 0)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `properties.${key}`);
  return [...CORE_FIELDS, ...props];
}

/** Reads a dot path out of a parsed entry. Returns undefined when absent. */
export function resolveField(entry: ObsidianLoreEntry, field: string): unknown {
  if (!field) return undefined;
  if (field.startsWith('properties.')) {
    return entry.properties?.[field.slice('properties.'.length)];
  }
  switch (field) {
    case 'title':
      return entry.title;
    case 'category':
      return entry.category;
    case 'summary':
      return entry.summary;
    case 'body':
      return plainTextFromMarkdown(entry.markdownBody ?? '');
    case 'tags':
      return entry.tags;
    default:
      return undefined;
  }
}

/** Renders a resolved value for a text object. */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((v) => formatFieldValue(v)).filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return '';
  return String(value);
}

/**
 * Coerces a resolved value to a chart value.
 *
 * Returns null rather than 0 when a field is missing or non-numeric: a stat
 * that is absent from canon is not a stat of zero, and plotting it as zero
 * would quietly assert something false about the character.
 */
export function numericFieldValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * The drawable URL for an image binding's embed, or null when the note no
 * longer carries it.
 */
export function resolveImageSrc(entry: ObsidianLoreEntry, reference: string): string | null {
  const image = findImage(entry, reference);
  return image ? imageUrl(entry.sourcePath, image) : null;
}

export interface BindingResolution {
  id: string;
  patch: Partial<CodexObject>;
}

/**
 * The patch that binding one object to one field means, right now.
 *
 * Binding without resolving was the original defect: choosing a note and a
 * field wrote the binding and nothing else, so the Properties panel showed the
 * canon value while the plate still said "TEXT". A binding that does not put
 * the value on the plate is not a binding, it is a note to self — so creating
 * or changing one resolves it immediately, in both modes. `once` means "stop
 * following", not "do not fill".
 *
 * An unresolvable field yields the binding alone: a plate must not lose its
 * title because a note was renamed or a key is missing.
 */
export function bindingPatch(
  object: CodexObject,
  entry: ObsidianLoreEntry | undefined,
  binding: CodexBinding,
  now = '',
): Partial<CodexObject> {
  const bound = { ...binding, resolvedAt: now } as CodexBinding;

  if (object.kind === 'text') {
    if (!entry) return { binding } as Partial<CodexObject>;
    const value = resolveField(entry, binding.field);
    if (value === undefined) return { binding } as Partial<CodexObject>;
    return { binding: bound, text: formatFieldValue(value) } as Partial<CodexObject>;
  }

  if (object.kind === 'image') {
    if (!entry) return { binding } as Partial<CodexObject>;
    const src = resolveImageSrc(entry, binding.field);
    // No src means the embed is gone from the note; keep the picture that is
    // on the plate rather than blanking it.
    return (src ? { binding: bound, src } : { binding }) as Partial<CodexObject>;
  }

  if (object.kind === 'chart') {
    if (!entry) return { binding } as Partial<CodexObject>;
    // Chart axes name their own fields, so binding the note is all this does;
    // the axes fill as each one is pointed at a key.
    const axes = object.axes.map((axis) => {
      if (!axis.field) return axis;
      const n = numericFieldValue(resolveField(entry, axis.field));
      return n === null ? axis : { ...axis, value: n };
    });
    return { binding: bound, axes } as Partial<CodexObject>;
  }

  return { binding } as Partial<CodexObject>;
}

export interface BindingReport {
  patches: BindingResolution[];
  /** Bindings whose note is no longer in the vault. */
  missingNotes: Array<{ id: string; notePath: string }>;
  /** Bindings whose note exists but no longer carries the field. */
  missingFields: Array<{ id: string; notePath: string; field: string }>;
}

function isLive(binding: CodexBinding | undefined): binding is CodexBinding {
  return !!binding && binding.mode === 'live';
}

/**
 * Re-resolves every live binding against the current vault.
 *
 * `once` bindings are deliberately ignored: they were filled at bind time and
 * are the user's to edit. Unresolvable bindings are reported rather than
 * blanking the object — a plate should not silently lose its title because a
 * note was renamed.
 */
export function resolveBindings(
  objects: CodexObject[],
  entriesByPath: Map<string, ObsidianLoreEntry>,
  now = '',
): BindingReport {
  const patches: BindingResolution[] = [];
  const missingNotes: BindingReport['missingNotes'] = [];
  const missingFields: BindingReport['missingFields'] = [];

  for (const object of objects) {
    if (object.kind === 'text') {
      if (!isLive(object.binding)) continue;
      const entry = entriesByPath.get(object.binding.notePath);
      if (!entry) {
        missingNotes.push({ id: object.id, notePath: object.binding.notePath });
        continue;
      }
      const value = resolveField(entry, object.binding.field);
      if (value === undefined) {
        missingFields.push({
          id: object.id,
          notePath: object.binding.notePath,
          field: object.binding.field,
        });
        continue;
      }
      patches.push({
        id: object.id,
        patch: {
          text: formatFieldValue(value),
          binding: { ...object.binding, resolvedAt: now },
        } as Partial<CodexObject>,
      });
    } else if (object.kind === 'image') {
      if (!isLive(object.binding)) continue;
      const entry = entriesByPath.get(object.binding.notePath);
      if (!entry) {
        missingNotes.push({ id: object.id, notePath: object.binding.notePath });
        continue;
      }
      // Always re-minted: the previous session's object URL is dead, so an
      // unchanged `src` here would leave a broken picture on the plate.
      const src = resolveImageSrc(entry, object.binding.field);
      if (!src) {
        missingFields.push({
          id: object.id,
          notePath: object.binding.notePath,
          field: object.binding.field,
        });
        continue;
      }
      patches.push({
        id: object.id,
        patch: {
          src,
          binding: { ...object.binding, resolvedAt: now },
        } as Partial<CodexObject>,
      });
    } else if (object.kind === 'chart') {
      if (!isLive(object.binding)) continue;
      const entry = entriesByPath.get(object.binding.notePath);
      if (!entry) {
        missingNotes.push({ id: object.id, notePath: object.binding.notePath });
        continue;
      }
      let changed = false;
      const axes = object.axes.map((axis) => {
        if (!axis.field) return axis;
        const n = numericFieldValue(resolveField(entry, axis.field));
        if (n === null) {
          missingFields.push({
            id: object.id,
            notePath: object.binding!.notePath,
            field: axis.field,
          });
          return axis;
        }
        if (n === axis.value) return axis;
        changed = true;
        return { ...axis, value: n };
      });
      if (changed) {
        patches.push({
          id: object.id,
          patch: {
            axes,
            binding: { ...object.binding, resolvedAt: now },
          } as Partial<CodexObject>,
        });
      }
    }
  }

  return { patches, missingNotes, missingFields };
}

/** Index parsed entries by the path the binding stores. */
export function indexEntries(entries: ObsidianLoreEntry[]): Map<string, ObsidianLoreEntry> {
  return new Map(entries.map((entry) => [entry.sourcePath, entry]));
}
