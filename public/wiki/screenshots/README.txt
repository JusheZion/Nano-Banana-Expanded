Portals Wiki — screenshot workflow
=================================

Capture
-------
- Viewport: 1440×900 (or document yours in the commit).
- Name files by portal + feature, e.g. studio-prompt-panel-2026-04.png
- Prefer WebP after optimization if repo size grows.

Markdown
--------
Reference from wiki markdown as: /wiki/screenshots/<portal>/<file>

Alt text
--------
Always set alt= in markdown so screen readers stay useful when UI changes.

When UI changes
---------------
- Replace the image,
- Bump lastReviewed in src/content/wiki/manifest.ts for that chapter,
- Optionally note app version in the article front matter or opening line.
