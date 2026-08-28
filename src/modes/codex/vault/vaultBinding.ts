/**
 * Resolving codex objects against parsed Obsidian notes.
 *
 * Kept pure and separate from `vaultAccess`: reading the vault needs a browser
 * and a user grant, whereas deciding what a bound object should say is plain
 * data in and data out, and is where the mistakes would be.
 */
import type { ObsidianLoreEntry } from '@/portals/writer/obsidianLoreImport';
import type { CodexBinding, CodexObject } from '../types/codexObjects';

/** Fields every note exposes, before its own frontmatter. */
export const CORE_FIELDS = ['title', 'category', 'summary', 'tags'] as const;

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

export interface BindingResolution {
  id: string;
  patch: Partial<CodexObject>;
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
