# Guided Comics Comic Library Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a blue/gold studio-tabletop Comic Library entry layer where series and issues appear as physical comic covers before the existing Issue Lightbox, Page Production, and Panel Focus workflow.

**Architecture:** Keep the current guided comic project library as the issue-level source of truth, derive series groups from `seriesTitle`, and store only entry-layout preferences locally. Add small helper modules and focused tests before changing `GuidedComicFlow.tsx`, then gate the new entry layer before the existing issue focus modes.

**Tech Stack:** React, TypeScript, localStorage, Vitest, Tailwind/CSS classes, existing Guided Comics project library helpers.

---

## Progress Checklist For The User

Use this checklist in status reports after each implementation pass so the user can tell what changed even when a pass is mostly structural.

- [x] **Pass 1: Library Data Foundation** - Saved comics can be grouped into series, one-shots still have series containers, and cover candidates can be derived.
- [~] **Pass 2: Local Preferences** - Portal entry layout persists locally. Selected-cover persistence and locked/unlocked background preference remain deferred.
- [x] **Pass 3: Entry Gate Wiring** - Comic Portal can stop at the library entry layer before opening the issue workflow.
- [x] **Pass 4: Series Cover Gallery** - Default opening screen shows comic-cover objects on a blue/gold studio tabletop, including a blank new-series cover.
- [x] **Pass 5: Series Focus** - Clicking a series brings the cover forward and shows title, premise, current/last issue, and issue-gallery access.
- [x] **Pass 6: Issue Cover Gallery** - Selected series shows issue covers plus a blank new-issue cover.
- [x] **Pass 7: Issue Workflow Handoff** - Selecting an issue enters the existing issue workflow without breaking context.
- [~] **Pass 8: Motion And Reduced Motion** - Baseline cover-state choreography and `prefers-reduced-motion` support are implemented. Fuller morph/parallax and Living Archive unlock remain deferred.
- [~] **Pass 9: QA And Regression** - Focused Vitest, lint, build, and local browser QA passed. Full deployed QA and broad Advanced Studio/Imageshop/Image Vault/save/load/export regression remain open.

## Files And Responsibilities

- Create `src/portals/guided-comic/guidedComicLibraryView.ts`
  - Derive series groups from `GuidedComicProject[]`.
  - Normalize series titles.
  - Pick default series and issue covers.
  - Count completed/cover-ready issues for the later archive-background unlock.

- Create `src/portals/guided-comic/guidedComicLibraryPreferences.ts`
  - Read, normalize, and write local entry preferences.
  - Keep preferences localStorage-only.

- Create `src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts`
  - Test series grouping, one-shot grouping, default cover selection, and completed issue counting.

- Create `src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts`
  - Test preference parsing, fallback defaults, malformed payloads, and local persistence helpers.

- Modify `src/portals/guided-comic/GuidedComicFlow.tsx`
  - Add local entry-stage state before existing workspace modes.
  - Render Series Cover Gallery, Series Focus, and Issue Cover Gallery.
  - Load selected issues through existing `switchCurrentComic`.
  - Keep `story-prep`, `issue-lightbox`, `page-production`, and `panel-focus` unchanged after issue entry.

- Modify `src/styles/theme.css` only if shared animation/background classes are cleaner than inline utility classes.

- Modify `walkthrough.md`
  - Append an implementation entry after each meaningful pass.

## Pass 1: Library Data Foundation

**Files:**
- Create: `src/portals/guided-comic/guidedComicLibraryView.ts`
- Create: `src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts`

- [x] **Step 1: Write failing tests for series grouping**

Create `guidedComicLibraryView.test.ts` with cases that expect:

```ts
import { describe, expect, it } from 'vitest';
import { createGuidedComicProject, type GuidedComicProjectSnapshot } from '@/portals/guided-comic/guidedComicProjectLibrary';
import {
  getGuidedComicCompletedIssueCount,
  getGuidedComicLibrarySeriesGroups,
  getGuidedComicProjectCoverImageUrl,
  getGuidedComicSeriesKey,
  getGuidedComicSeriesTitle,
} from '@/portals/guided-comic/guidedComicLibraryView';

function makeSnapshot(
  seriesTitle: string,
  issueTitle: string,
  issueNumber: string,
  overrides: Partial<GuidedComicProjectSnapshot> = {},
): GuidedComicProjectSnapshot {
  return {
    setupForm: {
      seriesTitle,
      issueTitle,
      issueNumber,
      targetPageCount: '4',
      genre: 'Adventure',
      tone: 'Cinematic',
      premise: `${seriesTitle} premise`,
    },
    storyForm: {
      premise: `${seriesTitle} premise`,
      mainCharacters: 'Mara',
      conflict: 'The gate opens.',
      setting: 'Astral City',
      endingGoal: 'Close the gate.',
    },
    outlineBeats: [],
    pageCards: [],
    characterReferences: {},
    locationReferences: {},
    npcReferences: {},
    panelArtStatuses: {},
    panelArtImages: {},
    pageLayoutTemplates: {},
    artDirection: {
      artStyle: 'clean line art',
      defaultAspectRatio: 'Match panel layout',
      renderingStyle: 'inked',
      colorMood: 'blue and gold',
      lighting: 'desk lamp',
      continuityNotes: '',
      excludeTextFromImages: true,
    },
    currentStep: 'pages',
    selectedPanelId: null,
    ...overrides,
  };
}

describe('guided comic library view', () => {
  it('normalizes series titles and keys', () => {
    expect(getGuidedComicSeriesTitle('  Astral City  ')).toBe('Astral City');
    expect(getGuidedComicSeriesTitle('')).toBe('Untitled series');
    expect(getGuidedComicSeriesKey(' Astral   City ')).toBe('astral-city');
  });

  it('groups issue-level projects into series containers', () => {
    const first = createGuidedComicProject(makeSnapshot('Astral City', 'Gate', '1'), {
      projectId: 'issue-1',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    const second = createGuidedComicProject(makeSnapshot('Astral City', 'Return', '2'), {
      projectId: 'issue-2',
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    });
    const oneShot = createGuidedComicProject(makeSnapshot('One Shot Archive', 'Only Issue', '1'), {
      projectId: 'one-shot',
      createdAt: '2026-05-03T00:00:00.000Z',
      updatedAt: '2026-05-03T00:00:00.000Z',
    });

    const groups = getGuidedComicLibrarySeriesGroups([second, oneShot, first]);

    expect(groups.map((group) => group.seriesTitle)).toEqual(['One Shot Archive', 'Astral City']);
    expect(groups.find((group) => group.seriesTitle === 'Astral City')?.projects.map((project) => project.projectId)).toEqual([
      'issue-1',
      'issue-2',
    ]);
  });

  it('derives cover image candidates from existing panel art images', () => {
    const project = createGuidedComicProject(
      makeSnapshot('Astral City', 'Gate', '1', {
        panelArtImages: {
          'page-1-panel-1': { imageUrl: 'data:image/png;base64,cover' },
        },
      }),
    );

    expect(getGuidedComicProjectCoverImageUrl(project)).toBe('data:image/png;base64,cover');
  });

  it('counts completed issues from export-stage snapshots for the archive unlock', () => {
    const complete = createGuidedComicProject(makeSnapshot('Astral City', 'Gate', '1', { currentStep: 'export' }));
    const incomplete = createGuidedComicProject(makeSnapshot('Astral City', 'Return', '2', { currentStep: 'pages' }));

    expect(getGuidedComicCompletedIssueCount([complete, incomplete])).toBe(1);
  });
});
```

- [x] **Step 2: Run tests and confirm failure**

Run:

```bash
npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts
```

Expected: fail because `guidedComicLibraryView.ts` does not exist.

- [x] **Step 3: Implement minimal library view helpers**

Create `guidedComicLibraryView.ts` with exported helpers:

```ts
import type { GuidedComicProject } from './guidedComicProjectLibrary';

export type GuidedComicSeriesGroup = {
  seriesKey: string;
  seriesTitle: string;
  premise: string;
  projects: GuidedComicProject[];
  defaultCoverProject: GuidedComicProject | null;
  lastUpdatedProject: GuidedComicProject | null;
  coverImageUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function getGuidedComicSeriesTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return title || 'Untitled series';
}

export function getGuidedComicSeriesKey(value: unknown): string {
  return getGuidedComicSeriesTitle(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-series';
}

function issueSortValue(project: GuidedComicProject): number {
  const parsed = Number.parseInt(project.issueNumber, 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function getImageUrl(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const imageUrl = value.imageUrl;
  const url = value.url;
  if (typeof imageUrl === 'string' && imageUrl.trim()) return imageUrl;
  if (typeof url === 'string' && url.trim()) return url;
  return null;
}

export function getGuidedComicProjectCoverImageUrl(project: GuidedComicProject): string | null {
  for (const value of Object.values(project.snapshot.panelArtImages)) {
    const imageUrl = getImageUrl(value);
    if (imageUrl) return imageUrl;
  }
  return null;
}

export function getGuidedComicCompletedIssueCount(projects: GuidedComicProject[]): number {
  return projects.filter((project) => project.snapshot.currentStep === 'export').length;
}

export function getGuidedComicLibrarySeriesGroups(projects: GuidedComicProject[]): GuidedComicSeriesGroup[] {
  const bySeries = new Map<string, GuidedComicProject[]>();

  projects.forEach((project) => {
    const key = getGuidedComicSeriesKey(project.seriesTitle || project.snapshot.setupForm.seriesTitle);
    bySeries.set(key, [...(bySeries.get(key) ?? []), project]);
  });

  return Array.from(bySeries.entries())
    .map(([seriesKey, seriesProjects]) => {
      const sortedProjects = [...seriesProjects].sort((left, right) => {
        const issueDelta = issueSortValue(left) - issueSortValue(right);
        if (issueDelta !== 0) return issueDelta;
        return left.createdAt.localeCompare(right.createdAt);
      });
      const lastUpdatedProject = [...seriesProjects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
      const defaultCoverProject = sortedProjects[0] ?? null;
      const coverProject = sortedProjects.find((project) => getGuidedComicProjectCoverImageUrl(project)) ?? defaultCoverProject;
      const seriesTitle = getGuidedComicSeriesTitle(defaultCoverProject?.seriesTitle ?? sortedProjects[0]?.snapshot.setupForm.seriesTitle);
      return {
        seriesKey,
        seriesTitle,
        premise: defaultCoverProject?.snapshot.storyForm.premise || defaultCoverProject?.snapshot.setupForm.premise || '',
        projects: sortedProjects,
        defaultCoverProject,
        lastUpdatedProject,
        coverImageUrl: coverProject ? getGuidedComicProjectCoverImageUrl(coverProject) : null,
      };
    })
    .sort((left, right) => (right.lastUpdatedProject?.updatedAt ?? '').localeCompare(left.lastUpdatedProject?.updatedAt ?? ''));
}
```

- [x] **Step 4: Run tests and confirm pass**

Run:

```bash
npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts
```

Expected: pass.

## Pass 2: Local Preferences

**Files:**
- Create: `src/portals/guided-comic/guidedComicLibraryPreferences.ts`
- Create: `src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts`

- [x] **Step 1: Write failing preference tests**

Test default layout, malformed payloads, and normalization:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES,
  normalizeGuidedComicLibraryEntryLayout,
  parseGuidedComicLibraryPreferences,
} from '@/portals/guided-comic/guidedComicLibraryPreferences';

describe('guided comic library preferences', () => {
  it('defaults to cover gallery first', () => {
    expect(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES.entryLayout).toBe('cover-gallery');
  });

  it('normalizes entry layout values', () => {
    expect(normalizeGuidedComicLibraryEntryLayout('last-series')).toBe('last-series');
    expect(normalizeGuidedComicLibraryEntryLayout('hybrid-shelf')).toBe('hybrid-shelf');
    expect(normalizeGuidedComicLibraryEntryLayout('bad')).toBe('cover-gallery');
  });

  it('parses preferences and rejects malformed payloads safely', () => {
    expect(parseGuidedComicLibraryPreferences(null)).toEqual(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES);
    expect(parseGuidedComicLibraryPreferences('not json')).toEqual(DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES);
    expect(
      parseGuidedComicLibraryPreferences(
        JSON.stringify({
          version: 1,
          entryLayout: 'last-series',
          seriesCoverProjectIds: { 'astral-city': 'issue-2' },
          livingArchiveBackgroundEnabled: true,
        }),
      ),
    ).toMatchObject({
      entryLayout: 'last-series',
      seriesCoverProjectIds: { 'astral-city': 'issue-2' },
      livingArchiveBackgroundEnabled: true,
    });
  });
});
```

- [~] **Step 2: Implement preference helpers**

Status note: entry-layout preference helpers are implemented and tested. Selected cover and Living Archive background preferences remain deferred.

Create `guidedComicLibraryPreferences.ts`:

```ts
export const GUIDED_COMIC_LIBRARY_PREFERENCES_STORAGE_KEY = 'arcs.guidedComicLibraryPreferences.v1';

export type GuidedComicLibraryEntryLayout = 'cover-gallery' | 'last-series' | 'hybrid-shelf';

export type GuidedComicLibraryPreferences = {
  version: 1;
  entryLayout: GuidedComicLibraryEntryLayout;
  seriesCoverProjectIds: Record<string, string>;
  livingArchiveBackgroundEnabled: boolean;
};

export const DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES: GuidedComicLibraryPreferences = {
  version: 1,
  entryLayout: 'cover-gallery',
  seriesCoverProjectIds: {},
  livingArchiveBackgroundEnabled: false,
};

export function normalizeGuidedComicLibraryEntryLayout(value: unknown): GuidedComicLibraryEntryLayout {
  return value === 'last-series' || value === 'hybrid-shelf' || value === 'cover-gallery' ? value : 'cover-gallery';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function parseGuidedComicLibraryPreferences(raw: string | null): GuidedComicLibraryPreferences {
  if (!raw) return DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== 1) return DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES;
    return {
      version: 1,
      entryLayout: normalizeGuidedComicLibraryEntryLayout(parsed.entryLayout),
      seriesCoverProjectIds: isRecord(parsed.seriesCoverProjectIds)
        ? Object.fromEntries(Object.entries(parsed.seriesCoverProjectIds).filter(([, value]) => typeof value === 'string'))
        : {},
      livingArchiveBackgroundEnabled: parsed.livingArchiveBackgroundEnabled === true,
    };
  } catch {
    return DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES;
  }
}

export function readGuidedComicLibraryPreferences(): GuidedComicLibraryPreferences {
  if (typeof window === 'undefined') return DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES;
  try {
    return parseGuidedComicLibraryPreferences(window.localStorage.getItem(GUIDED_COMIC_LIBRARY_PREFERENCES_STORAGE_KEY));
  } catch {
    return DEFAULT_GUIDED_COMIC_LIBRARY_PREFERENCES;
  }
}

export function writeGuidedComicLibraryPreferences(preferences: GuidedComicLibraryPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUIDED_COMIC_LIBRARY_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Local preferences are optional; ignore storage failures.
  }
}
```

- [x] **Step 3: Run preference tests**

Run:

```bash
npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts
```

Expected: pass.

## Pass 3: Entry Gate Wiring

**Files:**
- Modify: `src/portals/guided-comic/GuidedComicFlow.tsx`

- [x] **Step 1: Add local entry-stage state without changing workspace modes**

Add a component-local type near other local state types:

```ts
type GuidedComicLibraryStage = 'series-gallery' | 'series-focus' | 'issue-gallery' | 'issue-workspace';
```

Initialize state from the new preference:

```ts
const [comicLibraryPreferences, setComicLibraryPreferences] = useState(() => readGuidedComicLibraryPreferences());
const [libraryStage, setLibraryStage] = useState<GuidedComicLibraryStage>(() =>
  comicLibraryPreferences.entryLayout === 'last-series' ? 'series-focus' : 'series-gallery',
);
const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
```

The existing `workspaceMode` values must remain only:

```ts
'story-prep' | 'issue-lightbox' | 'page-production' | 'panel-focus'
```

- [x] **Step 2: Derive series groups from the existing project library**

Use:

```ts
const comicSeriesGroups = useMemo(
  () => getGuidedComicLibrarySeriesGroups(projectLibrary?.projects ?? []),
  [projectLibrary],
);
const selectedComicSeries =
  comicSeriesGroups.find((group) => group.seriesKey === selectedSeriesKey) ?? comicSeriesGroups[0] ?? null;
```

- [x] **Step 3: Gate rendering before the existing issue workflow**

Before returning the current issue workflow, compute:

```ts
const showComicLibraryEntry = libraryStage !== 'issue-workspace';
```

Render the new entry surfaces when `showComicLibraryEntry` is true. Keep the existing issue workflow as the path when it is false.

- [x] **Step 4: Browser smoke check**

Expected visible result:

- The portal can show a placeholder library entry layer.
- Existing Issue Lightbox/Page Production/Panel Focus still work after forcing `libraryStage` to `issue-workspace`.

## Pass 4: Series Cover Gallery

**Files:**
- Modify: `src/portals/guided-comic/GuidedComicFlow.tsx`
- Optional modify: `src/styles/theme.css`

- [x] **Step 1: Add tabletop gallery surface**

Create a local render block or small internal component in `GuidedComicFlow.tsx` named conceptually:

```tsx
const seriesCoverGallery = (
  <section aria-label="Comic series gallery">
    {/* studio tabletop background, series cover objects, blank new-series cover */}
  </section>
);
```

The production visual rules:

- Use cover aspect ratios like `aspect-[2/3]`.
- Use sharper cover corners such as `rounded-[3px]`, not rounded cards.
- Use blue/gold lighting in the background and active states.
- Use object shadows and slight transforms to imply covers on a desk.
- Do not wrap each series in a large rounded dashboard card.

- [x] **Step 2: Add blank new-series cover action**

The blank cover should call the existing `startNewComic` flow, then leave the user in Story/Prep or a future series setup state:

```tsx
<button type="button" onClick={startNewComic} aria-label="Start new series">
  Start New Series
</button>
```

Copy should be on/inside the blank cover object, not in a separate card footer.

- [x] **Step 3: Add preference selector**

Add a compact control for:

- `Cover Gallery First`
- `Last Series First`
- `Hybrid Shelf`

Changing the preference must update local preferences through `writeGuidedComicLibraryPreferences`.

- [x] **Step 4: Browser QA**

Expected visible result:

- Opening the portal shows a series cover gallery by default.
- Covers read as physical cover objects on a tabletop.
- The blank new-series cover is visible.
- The screen does not look like a dashboard.

## Pass 5: Series Focus

**Files:**
- Modify: `src/portals/guided-comic/GuidedComicFlow.tsx`

- [x] **Step 1: Add selected series behavior**

Clicking a series cover should:

```ts
setSelectedSeriesKey(group.seriesKey);
setLibraryStage('series-focus');
```

- [x] **Step 2: Render Series Focus**

Series Focus should show:

- Dominant selected series cover.
- Series title.
- Series premise.
- Issue count.
- Current or last issue worked on.
- Primary action: `Open Current Issue`.
- Secondary action: `Choose Issue`.
- Secondary action: `All Series`.

- [x] **Step 3: Preserve cover-object visual language**

The dominant series cover should remain a cover object, not a modal card. Side frames can use denser flat panels, but the cover is the hero.

- [x] **Step 4: Browser QA**

Expected visible result:

- Clicking a cover brings it forward.
- The selected series cover dominates.
- The user can clearly open the current issue or choose another issue.

## Pass 6: Issue Cover Gallery

**Files:**
- Modify: `src/portals/guided-comic/GuidedComicFlow.tsx`

- [x] **Step 1: Add issue gallery stage**

The `Choose Issue` action should:

```ts
setLibraryStage('issue-gallery');
```

- [~] **Step 2: Render issue covers for selected series**

Status note: issue covers render with issue number/title and cover imagery or placeholders. Last-updated/current-issue indicators remain available for a later metadata polish pass.

Use `selectedComicSeries.projects` as the issue list. Each issue cover should show:

- Issue number.
- Issue title.
- Last updated signal.
- Current/last issue indicator if relevant.

- [x] **Step 3: Add blank new-issue cover**

For first implementation, blank new issue may duplicate/start from the current series title:

```ts
applyGuidedComicProjectSnapshot({
  ...buildEmptyGuidedComicProjectSnapshot(),
  setupForm: {
    ...buildEmptyGuidedComicProjectSnapshot().setupForm,
    seriesTitle: selectedComicSeries.seriesTitle,
    issueNumber: String(selectedComicSeries.projects.length + 1),
  },
}, null);
setActiveProjectId(null);
setLibraryStage('issue-workspace');
setWorkspaceMode('story-prep');
```

- [x] **Step 4: Browser QA**

Expected visible result:

- Issue gallery is scoped to one series.
- Existing issues are covers.
- New issue is a blank cover object.

## Pass 7: Issue Workflow Handoff

**Files:**
- Modify: `src/portals/guided-comic/GuidedComicFlow.tsx`
- Test: existing focused Guided Comics tests

- [x] **Step 1: Open selected issue through existing project switching**

Create a wrapper around existing `switchCurrentComic(projectId)`:

```ts
const openComicIssueFromLibrary = (projectId: string) => {
  switchCurrentComic(projectId);
  setLibraryStage('issue-workspace');
};
```

Do not duplicate snapshot application logic.

- [x] **Step 2: Preserve existing reopen behavior after issue selection**

When an issue opens, keep current saved-comic reopen behavior:

- `last-active`
- `Issue Lightbox`
- `Page Production`

The new library entry preference controls portal entry, not issue-level workspace mode.

- [x] **Step 3: Run focused tests**

Run:

```bash
npm run test -- --run src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts
```

Expected: pass.

## Pass 8: Motion And Background Unlock

**Files:**
- Modify: `src/portals/guided-comic/GuidedComicFlow.tsx`
- Optional modify: `src/styles/theme.css`

- [x] **Step 1: Add motion classes for cover movement**

Use short transitions for:

- Gallery to Series Focus.
- Series Focus to Issue Gallery.
- Issue Gallery to Issue Lightbox.

Respect existing reduced-motion patterns:

```tsx
className="transition duration-500 motion-reduce:transition-none"
```

- [ ] **Step 2: Add locked Living Archive affordance**

Status note: completed-issue counting exists in helpers, but the locked/unlocked Living Archive UI was intentionally deferred.

Show the background option only when the helper determines at least four completed issues exist. If fewer than four exist, show a quiet locked state:

```tsx
const livingArchiveUnlocked = completedIssueCount >= 4;
```

Do not implement the full animated collage until enough panel-image selection logic is safe.

- [~] **Step 3: Browser QA**

Status note: baseline stage choreography and reduced-motion support were browser-reviewed. Living Archive QA remains open because that affordance is not implemented yet.

Expected visible result:

- Transitions feel like covers moving through space.
- Reduced motion remains usable.
- The archive background is clearly a later unlock, not an unfinished broken feature.

## Pass 9: Full Verification And Walkthrough

**Files:**
- Modify: `walkthrough.md`

- [~] **Step 1: Run focused tests**

Status note: the focused suite requested by the final pass was run and passed. This exact older five-file command, including `guidedComicProjectLibrary.test.ts`, was not rerun during the polish pass.

Run:

```bash
npm run test -- --run src/portals/guided-comic/__tests__/guidedComicLibraryView.test.ts src/portals/guided-comic/__tests__/guidedComicLibraryPreferences.test.ts src/portals/guided-comic/__tests__/guidedComicProjectLibrary.test.ts src/portals/guided-comic/__tests__/guidedComicPageNavigator.test.ts src/portals/guided-comic/__tests__/guidedComicAdvancedStudioAccess.test.ts
```

Expected: pass.

- [x] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: 0 errors. Existing warnings may remain if unrelated.

- [x] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: pass. Existing large chunk warning may remain if unrelated.

- [~] **Step 4: Browser QA full flow**

Status note: Comic Library entry flow, issue handoff, return to all series, choose-issue return, desktop/tablet/narrow re-entry, and console errors were checked locally. Full deployed QA plus Advanced Studio/Imageshop/Image Vault/save/load/export regression remain open.

Check:

- Portal opens to Series Cover Gallery by default.
- Series cover click enters Series Focus.
- Issue gallery opens from Series Focus.
- Issue cover click enters existing issue workflow.
- Issue Lightbox remains page-first.
- Page Production remains page-dominant.
- Panel Focus remains isolated.
- Advanced Studio handoff still works.
- Imageshop/Image Vault entry points still exist.
- Save/load/export surfaces are not removed.

- [x] **Step 5: Append walkthrough entry**

Append a section to `walkthrough.md` listing:

- Files touched.
- Visual changes.
- Under-the-hood changes.
- Tests run.
- Browser QA result.
- Remaining risks.
- Next pass checklist status.

Verify with:

```bash
rg -n "Guided Comics Comic Library Entry" walkthrough.md
git status --short walkthrough.md
```

## Reporting Template After Each Pass

Use this short report format after each implementation pass:

```md
### Comic Library Entry Progress

- Completed checklist item: Pass N - [name]
- What changed visually: ...
- What changed under the hood: ...
- What you should be able to see now: ...
- Verification run: ...
- Still pending: ...
```

## Key Risks

- `GuidedComicFlow.tsx` is already large; keep new helpers outside it where practical.
- Avoid adding new workspace modes; the library entry stage is a portal-entry layer, not a replacement for `story-prep`, `issue-lightbox`, `page-production`, or `panel-focus`.
- Do not make the tabletop view a grid of rounded cards. The production metaphor is physical covers in a scene.
- Do not let the living archive background compete with cover legibility.
- Keep Advanced Studio, Imageshop, Image Vault, save/load, export, panel geometry, shapes, balloons, and image preservation untouched unless a verified integration bug appears.
