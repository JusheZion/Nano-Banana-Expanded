import GithubSlugger from 'github-slugger';

/** Matches `rehype-slug` / GitHub heading ids so TOC `#links` align with rendered `<h2 id>`. */
export function tocFromMarkdown(md: string): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  const slugger = new GithubSlugger();
  const re = /^##\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const label = m[1].trim().replace(/\\#/g, '#');
    out.push({ id: slugger.slug(label), label });
  }
  return out;
}
