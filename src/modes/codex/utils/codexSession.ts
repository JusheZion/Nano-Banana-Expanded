export const CODEX_SESSION_KEY = 'codex.session.v1';
export const CODEX_PANEL_SECTIONS_KEY = 'codex.panelSections.v1';

export const CODEX_DOCK_TABS = [
  'sigils',
  'properties',
  'layers',
  'documents',
  'vault',
] as const;

export type CodexDockTab = (typeof CODEX_DOCK_TABS)[number];

export interface CodexSession {
  tab: CodexDockTab;
  zoom: number;
}

export type CodexCollapsedSections = Record<string, boolean>;

export const DEFAULT_CODEX_SESSION: CodexSession = {
  tab: 'sigils',
  zoom: 0.55,
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;

function isDockTab(value: unknown): value is CodexDockTab {
  return typeof value === 'string' && CODEX_DOCK_TABS.some((tab) => tab === value);
}

/**
 * Validates the local-storage boundary before session state reaches layout math.
 * Older, corrupt, or manually edited values fall back field-by-field.
 */
export function parseCodexSession(raw: string | null): CodexSession {
  if (!raw) return DEFAULT_CODEX_SESSION;

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return DEFAULT_CODEX_SESSION;
    }

    const record = value as Record<string, unknown>;
    const zoom = record.zoom;
    return {
      tab: isDockTab(record.tab) ? record.tab : DEFAULT_CODEX_SESSION.tab,
      zoom:
        typeof zoom === 'number' && Number.isFinite(zoom) && zoom >= MIN_ZOOM && zoom <= MAX_ZOOM
          ? zoom
          : DEFAULT_CODEX_SESSION.zoom,
    };
  } catch {
    return DEFAULT_CODEX_SESSION;
  }
}

export function readCodexSession(): CodexSession {
  try {
    return parseCodexSession(localStorage.getItem(CODEX_SESSION_KEY));
  } catch {
    return DEFAULT_CODEX_SESSION;
  }
}

export function writeCodexSession(session: CodexSession): void {
  try {
    localStorage.setItem(CODEX_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Blocked storage must not break the editor.
  }
}

export function parseCollapsedSections(raw: string | null): CodexCollapsedSections {
  if (!raw) return {};

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    );
  } catch {
    return {};
  }
}

export function readCollapsedSections(): CodexCollapsedSections {
  try {
    return parseCollapsedSections(localStorage.getItem(CODEX_PANEL_SECTIONS_KEY));
  } catch {
    return {};
  }
}

export function writeCollapsedSection(title: string, collapsed: boolean): void {
  try {
    localStorage.setItem(
      CODEX_PANEL_SECTIONS_KEY,
      JSON.stringify({ ...readCollapsedSections(), [title]: collapsed }),
    );
  } catch {
    // Blocked storage must not stop the section folding.
  }
}
