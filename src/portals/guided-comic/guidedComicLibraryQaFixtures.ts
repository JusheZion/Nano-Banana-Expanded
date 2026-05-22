import {
  createGuidedComicProject,
  type GuidedComicProject,
  type GuidedComicProjectLibrary,
  type GuidedComicProjectSnapshot,
} from '@/portals/guided-comic/guidedComicProjectLibrary';

export type GuidedComicLibraryQaFixtureName = 'empty' | 'many' | 'missing-covers';

const GUIDED_COMIC_LIBRARY_QA_FIXTURE_NAMES: GuidedComicLibraryQaFixtureName[] = ['empty', 'many', 'missing-covers'];

function isGuidedComicLibraryQaFixtureName(value: unknown): value is GuidedComicLibraryQaFixtureName {
  return typeof value === 'string' && GUIDED_COMIC_LIBRARY_QA_FIXTURE_NAMES.includes(value as GuidedComicLibraryQaFixtureName);
}

export function normalizeGuidedComicLibraryQaFixtureName(value: unknown): GuidedComicLibraryQaFixtureName | null {
  return isGuidedComicLibraryQaFixtureName(value) ? value : null;
}

export function readGuidedComicLibraryQaFixtureName(): GuidedComicLibraryQaFixtureName | null {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null;

  try {
    return normalizeGuidedComicLibraryQaFixtureName(new URLSearchParams(window.location.search).get('guidedComicLibraryFixture'));
  } catch {
    return null;
  }
}

function makeQaCoverDataUri(title: string, startColor: string, endColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
    <defs>
      <linearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="${startColor}"/>
        <stop offset="1" stop-color="${endColor}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="600" fill="url(#cover)"/>
    <circle cx="310" cy="92" r="74" fill="#f7d66d" opacity=".82"/>
    <path d="M0 420 C95 350 155 500 260 408 C320 356 352 366 400 322 L400 600 L0 600Z" fill="#050915" opacity=".72"/>
    <text x="34" y="86" font-family="Arial Black,Arial,sans-serif" font-size="34" fill="#fff">${title}</text>
    <text x="34" y="540" font-family="Arial Black,Arial,sans-serif" font-size="24" fill="#f8d474">GUIDED COMICS</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeQaPageCards(pageCount: number): GuidedComicProjectSnapshot['pageCards'] {
  return Array.from({ length: pageCount }, (_, index) => ({
    pageNumber: index + 1,
    summary: `QA page ${index + 1}`,
    panelCount: '4',
    keyCharacters: 'Mara, Sol',
    keyLocation: 'Studio table',
    expanded: index === 0,
    panelBeats: ['Open on the studio table.', 'Creator reacts.', 'Cover clue appears.', 'Turn the page.'],
  }));
}

function makeQaSnapshot(options: {
  seriesTitle: string;
  issueTitle: string;
  issueNumber: number;
  coverImageUrl: string | null;
  currentStep?: GuidedComicProjectSnapshot['currentStep'];
  pageCount?: number;
}): GuidedComicProjectSnapshot {
  const pageCount = options.pageCount ?? 4;

  return {
    writerIssueId: null,
    setupForm: {
      seriesTitle: options.seriesTitle,
      issueTitle: options.issueTitle,
      issueNumber: String(options.issueNumber),
      targetPageCount: String(pageCount),
      genre: 'Adventure',
      tone: 'Cinematic',
      layoutMarginMode: 'safe',
      layoutGutterMode: 'standard',
      premise: `${options.seriesTitle} follows a creator navigating production choices under strange studio light.`,
    },
    storyForm: {
      premise: `${options.seriesTitle} follows a creator navigating production choices under strange studio light.`,
      mainCharacters: 'A maker, a rival, and a city with secrets.',
      conflict: 'A production deadline uncovers a strange visual signal.',
      setting: 'A blue and gold studio desk.',
      endingGoal: 'Finish the issue without losing the creative thread.',
    },
    outlineBeats: [],
    pageCards: makeQaPageCards(pageCount),
    characterReferences: {},
    locationReferences: {},
    npcReferences: {},
    panelArtStatuses: {},
    panelArtImages: options.coverImageUrl
      ? {
          'qa-cover-panel': {
            imageUrl: options.coverImageUrl,
            source: 'upload',
            returnedAt: '2026-05-21T12:00:00.000Z',
            prompt: `${options.seriesTitle} cover QA fixture`,
          },
        }
      : {},
    pageLayoutTemplates: {},
    pageLayoutIntents: {},
    pageLayoutGeometry: {},
    writerDialogueSeeds: {},
    editableDialogueSeeds: {},
    promotedBalloonSeeds: {},
    artDirection: {
      artStyle: 'Graphic novel',
      defaultAspectRatio: 'Match panel layout',
      renderingStyle: 'clean comic ink',
      colorMood: 'blue and gold contrast',
      lighting: 'studio desk lamp',
      continuityNotes: '',
      excludeTextFromImages: true,
    },
    currentStep: options.currentStep ?? 'layout',
    selectedPanelId: 'qa-panel-1',
    activePageNumber: 1,
    workspaceMode: 'issue-lightbox',
  };
}

function makeQaProject(options: {
  seriesIndex: number;
  issueIndex: number;
  seriesTitle: string;
  issueTitle: string;
  coverImageUrl: string | null;
  nowMs: number;
}): GuidedComicProject {
  const updatedAt = new Date(options.nowMs - (options.seriesIndex * 20 + options.issueIndex) * 3_600_000).toISOString();
  const snapshot = makeQaSnapshot({
    seriesTitle: options.seriesTitle,
    issueTitle: options.issueTitle,
    issueNumber: options.issueIndex,
    coverImageUrl: options.coverImageUrl,
    currentStep: options.seriesIndex === 0 && options.issueIndex % 3 === 0 ? 'export' : 'layout',
    pageCount: options.issueIndex % 2 === 0 ? 5 : 3,
  });

  return createGuidedComicProject(snapshot, {
    projectId: `qa-${options.seriesIndex + 1}-${options.issueIndex}`,
    createdAt: new Date(options.nowMs - (options.seriesIndex * 20 + options.issueIndex + 12) * 3_600_000).toISOString(),
    updatedAt,
  });
}

function buildManyProjects(includeOnlyMissingCovers = false): GuidedComicProject[] {
  const nowMs = Date.UTC(2026, 4, 21, 12, 0, 0);
  const seriesTitles = [
    'Blue Meridian',
    'Goldline House',
    'Neon Margins',
    'Paper Lanterns',
    'Ink Circuit',
    'Last Broadcast',
    'Quiet Engines',
    'Panel Saints',
  ];

  return seriesTitles.flatMap((seriesTitle, seriesIndex) => {
    const issueTotal = seriesIndex === 0 ? 12 : (seriesIndex % 3) + 1;
    return Array.from({ length: issueTotal }, (_, issueOffset) => {
      const issueIndex = issueOffset + 1;
      const shouldOmitCover =
        includeOnlyMissingCovers || (seriesIndex === 0 && issueIndex % 4 === 0) || (seriesIndex === 3 && issueIndex === 1);
      const coverImageUrl = shouldOmitCover
        ? null
        : makeQaCoverDataUri(
            seriesTitle.split(' ')[0]?.toUpperCase() ?? 'QA',
            seriesIndex % 2 === 0 ? '#172044' : '#123b6d',
            seriesIndex % 2 === 0 ? '#8b2f4f' : '#8a6429',
          );

      return makeQaProject({
        seriesIndex,
        issueIndex,
        seriesTitle,
        issueTitle: issueIndex === 1 ? 'First Light' : `Issue ${issueIndex} Turn`,
        coverImageUrl,
        nowMs,
      });
    });
  });
}

export function getGuidedComicLibraryQaFixture(
  fixtureName: GuidedComicLibraryQaFixtureName | null,
): GuidedComicProjectLibrary | null {
  if (!fixtureName || fixtureName === 'empty') return null;

  const projects = buildManyProjects(fixtureName === 'missing-covers');
  return {
    version: 1,
    activeProjectId: projects[0]?.projectId ?? null,
    updatedAt: '2026-05-21T12:00:00.000Z',
    projects,
  };
}
