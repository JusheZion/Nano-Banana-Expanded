import type { GuidedComicProject } from '@/portals/guided-comic/guidedComicProjectLibrary';

export type GuidedComicSeriesGroup = {
  seriesKey: string;
  seriesTitle: string;
  premise: string;
  projects: GuidedComicProject[];
  defaultCoverProject: GuidedComicProject | null;
  selectedCoverProject: GuidedComicProject | null;
  coverProject: GuidedComicProject | null;
  lastUpdatedProject: GuidedComicProject | null;
  coverImageUrl: string | null;
};

export const GUIDED_COMIC_LIVING_ARCHIVE_UNLOCK_COUNT = 4;

function normalizeSeriesTitle(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function getGuidedComicSeriesTitle(value: unknown): string {
  return normalizeSeriesTitle(value) || 'Untitled series';
}

export function getGuidedComicSeriesKey(value: unknown): string {
  const key = getGuidedComicSeriesTitle(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return key || 'untitled-series';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cleanOptionalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function getGuidedComicProjectCoverImageUrl(project: GuidedComicProject): string | null {
  if (isRecord(project.snapshot.issueCoverImage)) {
    const coverImageUrl = cleanOptionalUrl(project.snapshot.issueCoverImage.imageUrl);
    if (coverImageUrl) return coverImageUrl;

    const coverUrl = cleanOptionalUrl(project.snapshot.issueCoverImage.url);
    if (coverUrl) return coverUrl;
  }

  const panelArtImages = project.snapshot.panelArtImages;
  if (!isRecord(panelArtImages)) return null;

  for (const candidate of Object.values(panelArtImages)) {
    if (!isRecord(candidate)) continue;

    const imageUrl = cleanOptionalUrl(candidate.imageUrl);
    if (imageUrl) return imageUrl;

    const url = cleanOptionalUrl(candidate.url);
    if (url) return url;
  }

  return null;
}

export function getGuidedComicCompletedIssueCount(projects: GuidedComicProject[]): number {
  return projects.filter((project) => project.snapshot.currentStep === 'export').length;
}

export function isGuidedComicLivingArchiveUnlocked(projects: GuidedComicProject[]): boolean {
  return getGuidedComicCompletedIssueCount(projects) >= GUIDED_COMIC_LIVING_ARCHIVE_UNLOCK_COUNT;
}

export function getGuidedComicDeleteIssueLabel(issueName: string): string {
  const trimmed = issueName.trim();
  return trimmed ? `Delete issue ${trimmed}` : 'Delete issue';
}

export function getGuidedComicDeleteSeriesLabel(seriesTitle: string): string {
  const trimmed = seriesTitle.trim();
  return trimmed ? `Delete series ${trimmed}` : 'Delete series';
}

function getSeriesTitleSource(project: GuidedComicProject): string {
  return normalizeSeriesTitle(project.seriesTitle) || normalizeSeriesTitle(project.snapshot.setupForm.seriesTitle);
}

function getIssueNumberSortValue(project: GuidedComicProject): number {
  const parsed = Number.parseFloat(project.issueNumber || project.snapshot.setupForm.issueNumber);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function compareProjectsForSeries(a: GuidedComicProject, b: GuidedComicProject): number {
  const issueDelta = getIssueNumberSortValue(a) - getIssueNumberSortValue(b);
  if (issueDelta !== 0) return issueDelta;
  return a.createdAt.localeCompare(b.createdAt);
}

function getLatestUpdatedProject(projects: GuidedComicProject[]): GuidedComicProject | null {
  return (
    projects.reduce<GuidedComicProject | null>(
      (latest, project) => (!latest || project.updatedAt.localeCompare(latest.updatedAt) > 0 ? project : latest),
      null,
    ) ?? null
  );
}

function getSeriesPremise(defaultCoverProject: GuidedComicProject | null): string {
  if (!defaultCoverProject) return '';
  return defaultCoverProject.snapshot.storyForm.premise || defaultCoverProject.snapshot.setupForm.premise || '';
}

function getSeriesCoverImageUrl(projects: (GuidedComicProject | null)[]): string | null {
  for (const project of projects) {
    if (!project) continue;
    const coverImageUrl = getGuidedComicProjectCoverImageUrl(project);
    if (coverImageUrl) return coverImageUrl;
  }

  return null;
}

export function getGuidedComicLibrarySeriesGroups(
  projects: GuidedComicProject[],
  seriesCoverProjectIds: Record<string, string> = {},
): GuidedComicSeriesGroup[] {
  const groupedProjects = new Map<string, GuidedComicProject[]>();
  const titlesByKey = new Map<string, string>();

  for (const project of projects) {
    const seriesTitleSource = getSeriesTitleSource(project);
    const seriesKey = getGuidedComicSeriesKey(seriesTitleSource);
    const seriesTitle = getGuidedComicSeriesTitle(seriesTitleSource);
    const existingProjects = groupedProjects.get(seriesKey);

    if (existingProjects) {
      existingProjects.push(project);
    } else {
      groupedProjects.set(seriesKey, [project]);
      titlesByKey.set(seriesKey, seriesTitle);
    }
  }

  return Array.from(groupedProjects.entries())
    .map(([seriesKey, seriesProjects]) => {
      const sortedProjects = [...seriesProjects].sort(compareProjectsForSeries);
      const defaultCoverProject = sortedProjects[0] ?? null;
      const selectedCoverProject =
        sortedProjects.find((project) => project.projectId === seriesCoverProjectIds[seriesKey]) ?? null;
      const coverProject = selectedCoverProject ?? defaultCoverProject;
      const lastUpdatedProject = getLatestUpdatedProject(sortedProjects);

      return {
        seriesKey,
        seriesTitle: titlesByKey.get(seriesKey) ?? 'Untitled series',
        premise: getSeriesPremise(defaultCoverProject),
        projects: sortedProjects,
        defaultCoverProject,
        selectedCoverProject,
        coverProject,
        lastUpdatedProject,
        coverImageUrl: selectedCoverProject
          ? getGuidedComicProjectCoverImageUrl(selectedCoverProject)
          : getSeriesCoverImageUrl(sortedProjects),
      };
    })
    .sort((a, b) => {
      const aUpdatedAt = a.lastUpdatedProject?.updatedAt ?? '';
      const bUpdatedAt = b.lastUpdatedProject?.updatedAt ?? '';
      return bUpdatedAt.localeCompare(aUpdatedAt);
    });
}
