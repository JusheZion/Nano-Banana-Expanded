/**
 * Portals Wiki — chapter list and maintenance metadata.
 * Update `lastReviewed` when you refresh copy or screenshots for a portal.
 */
export type WikiChapterMeta = {
  id: string;
  title: string;
  /** User-facing portal name (may differ from nav id, e.g. Storyline Studio). */
  subtitle: string;
  lastReviewed?: string;
};

export const WIKI_APP_DOC_VERSION = '0.0.0';

export const WIKI_CHAPTERS: WikiChapterMeta[] = [
  {
    id: 'home',
    title: 'Hub & overview',
    subtitle: 'Landing, sidebar, account',
    lastReviewed: '2026-04-05',
  },
  {
    id: 'studio',
    title: 'Reference Character Studio',
    subtitle: 'Characters & generations',
    lastReviewed: '2026-04-05',
  },
  {
    id: 'assets',
    title: 'Assets Studio',
    subtitle: 'Props & environments',
    lastReviewed: '2026-04-05',
  },
  {
    id: 'reference',
    title: 'Image Vault',
    subtitle: 'Reference library',
    lastReviewed: '2026-04-05',
  },
  {
    id: 'lab',
    title: 'Image Workshop',
    subtitle: 'Writer handoff, vault matching, quick refs, and Image Lab (portal id: lab)',
    lastReviewed: '2026-04-05',
  },
  {
    id: 'comic',
    title: 'Comic Studio',
    subtitle: 'Pages & panels',
    lastReviewed: '2026-04-05',
  },
  {
    id: 'writer',
    title: "Writers' Workshop",
    subtitle: 'Series, issues, AI tools',
    lastReviewed: '2026-04-05',
  },
];

export function wikiChapterById(id: string): WikiChapterMeta | undefined {
  return WIKI_CHAPTERS.find((c) => c.id === id);
}
