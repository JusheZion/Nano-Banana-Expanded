export const GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY = 'arcs.guidedComicProjectLibrary.v1';

export type GuidedComicProjectStepId =
  | 'setup'
  | 'story'
  | 'pages'
  | 'visual-prep'
  | 'art'
  | 'layout'
  | 'export';

export type GuidedComicProjectSnapshot = {
  writerIssueId?: string | null;
  setupForm: {
    seriesTitle: string;
    issueTitle: string;
    issueNumber: string;
    targetPageCount: string;
    genre: string;
    tone: string;
    layoutMarginMode?: 'safe' | 'full-bleed';
    layoutGutterMode?: 'standard' | 'thin';
    premise: string;
  };
  storyForm: {
    premise: string;
    mainCharacters: string;
    conflict: string;
    setting: string;
    endingGoal: string;
  };
  outlineBeats: unknown[];
  pageCards: unknown[];
  characterReferences: Record<string, unknown[]>;
  locationReferences: Record<string, unknown[]>;
  npcReferences: Record<string, unknown[]>;
  panelArtStatuses: Record<string, unknown>;
  panelArtImages: Record<string, unknown>;
  pageLayoutTemplates: Record<number, unknown>;
  pageLayoutIntents?: Record<number, unknown>;
  pageLayoutGeometry?: Record<number, unknown[]>;
  writerDialogueSeeds?: Record<number, unknown>;
  artDirection: {
    artStyle: string;
    defaultAspectRatio: string;
    renderingStyle: string;
    colorMood: string;
    lighting: string;
    continuityNotes: string;
    excludeTextFromImages: boolean;
  };
  currentStep: GuidedComicProjectStepId;
  selectedPanelId?: string | null;
};

export type GuidedComicProject = {
  projectId: string;
  seriesTitle: string;
  issueTitle: string;
  issueNumber: string;
  createdAt: string;
  updatedAt: string;
  snapshot: GuidedComicProjectSnapshot;
};

export type GuidedComicProjectLibrary = {
  version: 1;
  activeProjectId: string | null;
  updatedAt: string;
  projects: GuidedComicProject[];
};

type ProjectOptions = {
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function createGuidedComicProjectId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `guided-${crypto.randomUUID()}`;
  }
  return `guided-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanProjectTitle(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function projectMetadataFromSnapshot(snapshot: GuidedComicProjectSnapshot) {
  return {
    seriesTitle: cleanProjectTitle(snapshot.setupForm.seriesTitle),
    issueTitle: cleanProjectTitle(snapshot.setupForm.issueTitle),
    issueNumber: cleanProjectTitle(snapshot.setupForm.issueNumber),
  };
}

export function getGuidedComicProjectDisplayName(project: Pick<GuidedComicProject, 'seriesTitle' | 'issueTitle' | 'issueNumber'>): string {
  const seriesTitle = cleanProjectTitle(project.seriesTitle);
  const issueTitle = cleanProjectTitle(project.issueTitle);
  const issueNumber = cleanProjectTitle(project.issueNumber);
  const seriesWithIssue = [seriesTitle, issueNumber ? `#${issueNumber}` : ''].filter(Boolean).join(' ');

  if (seriesWithIssue && issueTitle) return `${seriesWithIssue}: ${issueTitle}`;
  if (seriesWithIssue) return seriesWithIssue;
  if (issueTitle) return issueTitle;
  return 'Untitled guided comic';
}

export function createGuidedComicProject(
  snapshot: GuidedComicProjectSnapshot,
  options: ProjectOptions = {},
): GuidedComicProject {
  const timestamp = options.updatedAt ?? options.createdAt ?? nowIso();
  return {
    projectId: options.projectId ?? createGuidedComicProjectId(),
    ...projectMetadataFromSnapshot(snapshot),
    createdAt: options.createdAt ?? timestamp,
    updatedAt: timestamp,
    snapshot,
  };
}

export function createGuidedComicProjectLibrary(
  snapshot: GuidedComicProjectSnapshot,
  options: { projectId?: string; now?: string } = {},
): GuidedComicProjectLibrary {
  const timestamp = options.now ?? nowIso();
  const project = createGuidedComicProject(snapshot, {
    projectId: options.projectId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return {
    version: 1,
    activeProjectId: project.projectId,
    updatedAt: timestamp,
    projects: [project],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isProjectSnapshot(value: unknown): value is GuidedComicProjectSnapshot {
  if (!isRecord(value)) return false;
  return isRecord(value.setupForm) && isRecord(value.storyForm) && typeof value.currentStep === 'string';
}

function isProject(value: unknown): value is GuidedComicProject {
  if (!isRecord(value)) return false;
  return (
    typeof value.projectId === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isProjectSnapshot(value.snapshot)
  );
}

export function parseGuidedComicProjectLibrary(rawLibrary: string | null): GuidedComicProjectLibrary | null {
  if (!rawLibrary) return null;

  try {
    const parsed = JSON.parse(rawLibrary) as unknown;
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.projects)) return null;

    const projects = parsed.projects.filter(isProject).map((project) => ({
      ...project,
      ...projectMetadataFromSnapshot(project.snapshot),
    }));
    const activeProjectId =
      typeof parsed.activeProjectId === 'string' && projects.some((project) => project.projectId === parsed.activeProjectId)
        ? parsed.activeProjectId
        : projects[0]?.projectId ?? null;

    return {
      version: 1,
      activeProjectId,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      projects,
    };
  } catch {
    return null;
  }
}

export function upsertGuidedComicProject(
  library: GuidedComicProjectLibrary,
  project: GuidedComicProject,
  makeActive = false,
): GuidedComicProjectLibrary {
  const found = library.projects.some((candidate) => candidate.projectId === project.projectId);
  return {
    ...library,
    activeProjectId: makeActive ? project.projectId : library.activeProjectId,
    updatedAt: project.updatedAt,
    projects: found
      ? library.projects.map((candidate) => (candidate.projectId === project.projectId ? project : candidate))
      : [...library.projects, project],
  };
}

export function renameGuidedComicProject(
  library: GuidedComicProjectLibrary,
  projectId: string,
  updates: { seriesTitle: string; issueTitle: string; issueNumber: string; updatedAt?: string },
): GuidedComicProjectLibrary {
  const updatedAt = updates.updatedAt ?? nowIso();
  return {
    ...library,
    updatedAt,
    projects: library.projects.map((project) =>
      project.projectId === projectId
        ? {
            ...project,
            seriesTitle: cleanProjectTitle(updates.seriesTitle),
            issueTitle: cleanProjectTitle(updates.issueTitle),
            issueNumber: cleanProjectTitle(updates.issueNumber),
            updatedAt,
          }
        : project,
    ),
  };
}

export function duplicateGuidedComicProject(project: GuidedComicProject, options: ProjectOptions = {}): GuidedComicProject {
  const timestamp = options.updatedAt ?? options.createdAt ?? nowIso();
  return {
    ...project,
    projectId: options.projectId ?? createGuidedComicProjectId(),
    seriesTitle: project.seriesTitle ? `${project.seriesTitle} Copy` : 'Untitled guided comic copy',
    createdAt: options.createdAt ?? timestamp,
    updatedAt: timestamp,
    snapshot: {
      ...project.snapshot,
      setupForm: {
        ...project.snapshot.setupForm,
        seriesTitle: project.seriesTitle ? `${project.seriesTitle} Copy` : project.snapshot.setupForm.seriesTitle,
      },
    },
  };
}

export function deleteGuidedComicProject(library: GuidedComicProjectLibrary, projectId: string): GuidedComicProjectLibrary {
  const projects = library.projects.filter((project) => project.projectId !== projectId);
  const activeProjectId =
    library.activeProjectId === projectId ? projects[0]?.projectId ?? null : library.activeProjectId;
  return {
    ...library,
    activeProjectId,
    updatedAt: nowIso(),
    projects,
  };
}

export function isGuidedComicProjectSnapshotDirty(
  snapshot: GuidedComicProjectSnapshot,
  project: GuidedComicProject | null | undefined,
): boolean {
  if (!project) return true;
  return JSON.stringify(snapshot) !== JSON.stringify(project.snapshot);
}
