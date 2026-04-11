import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { BookMarked, ChevronLeft, Library } from 'lucide-react';
import type { Portal } from '@/shared/portals';
import { WIKI_APP_DOC_VERSION, WIKI_CHAPTERS, wikiChapterById } from '@/content/wiki/manifest';
import { wikiMarkdownById } from '@/content/wiki/wikiImports';
import { tocFromMarkdown } from '@/content/wiki/wikiToc';
import {
  ACCENT_GOLD_GRADIENT,
  ACCENT_GOLD_SOLID,
  WIKI_NAV_ACCENT,
  WIKI_SHELL_BG_FLAT,
} from '@/shared/theme/Phase12DesignTokens';

export type WikiJump = {
  chapterId: string;
  headingId?: string;
} | null;

export type WikiPortalProps = {
  jumpNonce: number;
  jump: WikiJump;
  onNavigatePortal: (p: Portal) => void;
};

export const WikiPortal: React.FC<WikiPortalProps> = ({ jumpNonce, jump, onNavigatePortal }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!jump?.chapterId) return;
    setSelectedId(jump.chapterId);
  }, [jumpNonce, jump?.chapterId]);

  useEffect(() => {
    if (!jump?.headingId || !selectedId) return;
    const t = window.setTimeout(() => {
      document.getElementById(jump.headingId!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(t);
  }, [jumpNonce, jump?.headingId, selectedId]);

  const hub = selectedId === null;

  const md = selectedId ? wikiMarkdownById[selectedId] : null;
  const meta = selectedId ? wikiChapterById(selectedId) : null;
  const toc = useMemo(() => (md ? tocFromMarkdown(md) : []), [md]);

  return (
    <div
      className="flex flex-col h-full min-h-0 text-white/90"
      style={{ backgroundColor: WIKI_SHELL_BG_FLAT }}
    >
      <header
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 glass-panel"
        style={{ borderColor: `${ACCENT_GOLD_SOLID}33` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-white/15"
            style={{ background: ACCENT_GOLD_GRADIENT }}
          >
            <BookMarked className="w-5 h-5 text-black/85" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight truncate" style={{ color: '#fcf6ba' }}>
              Portals Wiki
            </h1>
            <p className="text-[10px] uppercase tracking-wider opacity-70 truncate">
              In-app docs · v{WIKI_APP_DOC_VERSION}
            </p>
          </div>
        </div>
        {!hub && (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/40 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            All chapters
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-6">
        {hub ? (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="glass-card rounded-2xl p-5 border border-white/10" style={{ background: 'rgba(42, 21, 53, 0.55)' }}>
              <p className="text-sm text-white/85 leading-relaxed">
                Documentation organized by portal. Open a chapter for navigation maps, tools, customization notes, and
                screenshots. <strong className="text-white">No account is required</strong> to read the wiki.
              </p>
              <p className="text-xs text-white/55 mt-3">
                When the app changes, update the markdown under <code className="text-white/80">src/content/wiki/</code>, refresh
                screenshots in <code className="text-white/80">public/wiki/screenshots/</code>, and bump{' '}
                <code className="text-white/80">lastReviewed</code> in the manifest.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WIKI_CHAPTERS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200/50"
                  style={{ boxShadow: `0 0 0 1px ${ACCENT_GOLD_SOLID}18` }}
                >
                  <div className="flex items-start gap-3">
                    <Library className="w-5 h-5 shrink-0 mt-0.5" style={{ color: WIKI_NAV_ACCENT }} aria-hidden />
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold truncate" style={{ color: '#fde68a' }}>
                        {c.title}
                      </h2>
                      <p className="text-xs text-white/65 mt-1 leading-snug">{c.subtitle}</p>
                      {c.lastReviewed && (
                        <p className="text-[10px] text-white/40 mt-2">Last reviewed {c.lastReviewed}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-white/45">
              Return to the app hub:{' '}
              <button
                type="button"
                className="underline font-medium"
                style={{ color: WIKI_NAV_ACCENT }}
                onClick={() => onNavigatePortal('home')}
              >
                Overview
              </button>
            </p>
          </div>
        ) : md && meta ? (
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 min-h-0">
            {toc.length > 0 && (
              <nav
                aria-label="On this page"
                className="lg:w-56 shrink-0 lg:sticky lg:top-0 lg:self-start glass-panel rounded-xl p-4 border border-white/10 h-fit max-h-[50vh] lg:max-h-[calc(100vh-8rem)] overflow-y-auto"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: ACCENT_GOLD_SOLID }}>
                  On this page
                </p>
                <ul className="space-y-1.5 text-xs">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block py-1 px-2 rounded-md text-white/75 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-200/50"
                        style={{ borderLeft: `2px solid transparent` }}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <article
              className="flex-1 min-w-0 glass-panel rounded-2xl p-5 md:p-8 border border-white/10 wiki-prose"
              style={{ background: 'rgba(26, 15, 34, 0.55)' }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-4 opacity-60" style={{ color: WIKI_NAV_ACCENT }}>
                {meta.subtitle}
              </p>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                  rehypeSlug,
                  [rehypeAutolinkHeadings, { behavior: 'wrap' as const }],
                ]}
              >
                {md}
              </ReactMarkdown>
            </article>
          </div>
        ) : (
          <p className="text-white/55 text-center text-sm">Chapter not found.</p>
        )}
      </div>
    </div>
  );
};
