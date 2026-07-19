type OutlineBeat = {
  page_target?: number;
  scene?: string;
  summary?: string;
  emotional_turn?: string;
};

type OutlineJsonLike = {
  title?: string;
  premise?: string;
  acts?: Array<{ name?: string; goal?: string; summary?: string }>;
  page_beats?: OutlineBeat[];
};

function asOutlineJsonLike(outlineJson: unknown): OutlineJsonLike | null {
  if (!outlineJson || typeof outlineJson !== 'object' || Array.isArray(outlineJson)) return null;
  return outlineJson as OutlineJsonLike;
}

function safeText(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Returns the highest explicit page marker in a pasted outline. Supports both
 * `Page 12` headings and conventional numbered-list lines such as `12.` or
 * tab-separated `12\tScene`. Values above the Writer page limit are ignored.
 */
export function inferOutlineTargetPageCount(text: string, maxPages = 200): number | null {
  const pageNumbers: number[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const explicitPage = line.match(/\bPage\s+(\d{1,3})\b/i);
    const numberedLine = line.match(/^(\d{1,3})(?:\t+|[.)]\s+)/);
    const value = Number(explicitPage?.[1] ?? numberedLine?.[1] ?? 0);
    if (value >= 1 && value <= maxPages) pageNumbers.push(value);
  }
  return pageNumbers.length ? Math.max(...pageNumbers) : null;
}

export function formatOutlineAsText(outlineJson: unknown): string {
  const o = asOutlineJsonLike(outlineJson);
  if (!o) return 'Outline: (missing)\n';

  const lines: string[] = [];
  const title = safeText(o.title);
  const premise = safeText(o.premise);
  if (title) lines.push(`TITLE: ${title}`);
  if (premise) lines.push(`PREMISE: ${premise}`);

  if (Array.isArray(o.acts) && o.acts.length) {
    lines.push('');
    lines.push('ACTS:');
    for (const [idx, a] of o.acts.entries()) {
      const name = safeText(a?.name) || `Act ${idx + 1}`;
      const goal = safeText(a?.goal);
      const summary = safeText(a?.summary);
      lines.push(`- ${name}${goal ? ` — ${goal}` : ''}${summary ? `: ${summary}` : ''}`);
    }
  }

  const beats = Array.isArray(o.page_beats) ? o.page_beats : [];
  if (beats.length) {
    lines.push('');
    lines.push('PAGE BEATS:');
    for (const b of beats) {
      const page = typeof b.page_target === 'number' ? `Page ${b.page_target}` : 'Page ?';
      const scene = safeText(b.scene);
      const summary = safeText(b.summary);
      const turn = safeText(b.emotional_turn);
      const head = [page, scene].filter(Boolean).join(' — ');
      const tail = [summary, turn ? `(turn: ${turn})` : ''].filter(Boolean).join(' ');
      lines.push(`- ${head}${tail ? `: ${tail}` : ''}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function splitOnFirst(s: string, sep: string): [string, string] {
  const i = s.indexOf(sep);
  if (i < 0) return [s, ''];
  return [s.slice(0, i), s.slice(i + sep.length)];
}

function parseOutlineActLine(body: string): { name?: string; goal?: string; summary?: string } {
  let name = body.trim();
  let goal = '';
  let summary = '';
  const em = body.indexOf(' — ');
  if (em >= 0) {
    name = body.slice(0, em).trim();
    const [g, s] = splitOnFirst(body.slice(em + 3), ': ');
    goal = g.trim();
    summary = s.trim();
  } else {
    const [n, s] = splitOnFirst(body, ': ');
    name = n.trim();
    summary = s.trim();
  }
  const act: { name?: string; goal?: string; summary?: string } = {};
  if (name) act.name = name;
  if (goal) act.goal = goal;
  if (summary) act.summary = summary;
  return act;
}

function parseOutlineActHeading(line: string): { name?: string; summary?: string } | null {
  const normalized = line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^(?:\*\*|__)/, '')
    .replace(/(?:\*\*|__)$/, '')
    .trim();
  const match = normalized.match(
    /^Act\s+(\d+|[IVXLCDM]+|one|two|three|four|five|six|seven|eight|nine|ten)\b(?:\s*(?:[-‐‑‒–—:.])\s*(.*))?$/i,
  );
  if (!match) return null;
  return {
    name: `Act ${match[1]}`,
    ...(match[2]?.trim() ? { summary: match[2].trim() } : {}),
  };
}

function parseOutlineBeatLine(body: string): OutlineBeat {
  let s = body.trim();
  let turn = '';
  const turnMatch = s.match(/\s*\(turn:\s*([^)]*)\)\s*$/i);
  if (turnMatch) {
    turn = turnMatch[1].trim();
    s = s.slice(0, turnMatch.index).trim();
  }
  let head = s;
  let scene = '';
  let summary = '';
  const em = s.indexOf(' — ');
  if (em >= 0) {
    head = s.slice(0, em).trim();
    const [sc, su] = splitOnFirst(s.slice(em + 3), ': ');
    scene = sc.trim();
    summary = su.trim();
  } else {
    const [h, su] = splitOnFirst(s, ': ');
    head = h.trim();
    summary = su.trim();
  }
  const beat: OutlineBeat = {};
  const pm = head.match(/Page\s+(\d+)/i);
  if (pm) beat.page_target = Number(pm[1]);
  if (scene) beat.scene = scene;
  if (summary) beat.summary = summary;
  if (turn) beat.emotional_turn = turn;
  return beat;
}

/**
 * Inverse of {@link formatOutlineAsText}. Parses the readable TITLE/PREMISE/ACTS/
 * PAGE BEATS format back into outline fields so the plain-text editor can round-trip.
 * Only returns the fields it recognizes — callers should merge into the existing
 * outline JSON to preserve any other top-level data.
 */
export function parseOutlineText(text: string): OutlineJsonLike {
  const result: OutlineJsonLike = {};
  const acts: NonNullable<OutlineJsonLike['acts']> = [];
  const beats: OutlineBeat[] = [];
  let section: 'none' | 'acts' | 'beats' = 'none';
  let sawActsSection = false;
  let sawBeatsSection = false;
  let currentAct: NonNullable<OutlineJsonLike['acts']>[number] | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const upper = line.toUpperCase();
    if (upper.startsWith('TITLE:')) {
      result.title = line.slice(line.indexOf(':') + 1).trim();
      section = 'none';
      continue;
    }
    if (upper.startsWith('PREMISE:')) {
      result.premise = line.slice(line.indexOf(':') + 1).trim();
      section = 'none';
      continue;
    }
    if (upper === 'ACTS:') {
      section = 'acts';
      sawActsSection = true;
      currentAct = null;
      continue;
    }
    if (upper === 'PAGE BEATS:') {
      section = 'beats';
      sawBeatsSection = true;
      currentAct = null;
      continue;
    }
    const actHeading = parseOutlineActHeading(line);
    if (actHeading) {
      section = 'acts';
      sawActsSection = true;
      currentAct = {
        ...actHeading,
      };
      acts.push(currentAct);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const body = line.replace(/^[-*]\s+/, '');
      if (section === 'acts') {
        currentAct = body.includes(' — ')
          ? parseOutlineActLine(body)
          : (parseOutlineActHeading(body) ?? parseOutlineActLine(body));
        acts.push(currentAct);
      }
      else if (section === 'beats') beats.push(parseOutlineBeatLine(body));
      continue;
    }
    const numberedBeat = line.match(/^(\d+)(?:\t+|[.)]\s+)(.+)$/);
    if (numberedBeat && section !== 'acts') {
      beats.push(parseOutlineBeatLine(`Page ${numberedBeat[1]} — ${numberedBeat[2]}`));
      continue;
    }
    if (section === 'acts' && currentAct) {
      currentAct.summary = [currentAct.summary, line].filter(Boolean).join(' ');
    }
  }

  if (sawActsSection) result.acts = acts;
  if (sawBeatsSection || beats.length) result.page_beats = beats;
  return result;
}

export function formatOutlineAsMarkdown(outlineJson: unknown): string {
  const o = asOutlineJsonLike(outlineJson);
  if (!o) return '# Outline\n\n(missing)\n';

  const lines: string[] = [];
  lines.push('# Outline');

  const title = safeText(o.title);
  const premise = safeText(o.premise);
  if (title) lines.push('', `## Title`, '', title);
  if (premise) lines.push('', `## Premise`, '', premise);

  if (Array.isArray(o.acts) && o.acts.length) {
    lines.push('', '## Acts', '');
    for (const [idx, a] of o.acts.entries()) {
      const name = safeText(a?.name) || `Act ${idx + 1}`;
      const goal = safeText(a?.goal);
      const summary = safeText(a?.summary);
      lines.push(`- **${name}**${goal ? ` — ${goal}` : ''}${summary ? `: ${summary}` : ''}`);
    }
  }

  const beats = Array.isArray(o.page_beats) ? o.page_beats : [];
  if (beats.length) {
    lines.push('', '## Page beats', '');
    for (const b of beats) {
      const page = typeof b.page_target === 'number' ? `Page ${b.page_target}` : 'Page ?';
      const scene = safeText(b.scene);
      const summary = safeText(b.summary);
      const turn = safeText(b.emotional_turn);
      const head = [page, scene].filter(Boolean).join(' — ');
      const tail = [summary, turn ? `_turn: ${turn}_` : ''].filter(Boolean).join(' · ');
      lines.push(`- **${head}**${tail ? `: ${tail}` : ''}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

type BeatsJsonLike = {
  one_line_hook?: string;
  panels?: Array<{
    index?: number;
    action?: string;
    dialogue?: string;
    composition?: string;
    notes?: string;
  }>;
};

function asBeatsJsonLike(v: unknown): BeatsJsonLike | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as BeatsJsonLike;
}

export function formatBeatsBundleAsText(
  pages: Array<{ page_number: number; beats_json: unknown | null }>,
): string {
  const lines: string[] = [];
  for (const p of pages) {
    lines.push(`PAGE ${p.page_number}`);
    const b = asBeatsJsonLike(p.beats_json);
    const hook = safeText(b?.one_line_hook);
    if (hook) lines.push(hook);
    const panels = Array.isArray(b?.panels) ? b!.panels! : [];
    if (!panels.length) {
      lines.push('(no beats)');
    } else {
      for (const [idx, panel] of panels.entries()) {
        const i = typeof panel?.index === 'number' ? panel.index : idx + 1;
        const action = safeText(panel?.action);
        const dialogue = safeText(panel?.dialogue);
        const composition = safeText(panel?.composition);
        const notes = safeText(panel?.notes);
        const bits = [
          action ? action : '',
          dialogue ? `Dialogue: ${dialogue}` : '',
          composition ? `Composition: ${composition}` : '',
          notes ? `Notes: ${notes}` : '',
        ].filter(Boolean);
        lines.push(`- Panel ${i}${bits.length ? `: ${bits.join(' · ')}` : ''}`);
      }
    }
    lines.push('', '---', '');
  }
  return `${lines.join('\n').trim()}\n`;
}

export function formatBeatsBundleAsMarkdown(
  pages: Array<{ page_number: number; beats_json: unknown | null }>,
): string {
  const lines: string[] = ['# Page beats', ''];
  for (const p of pages) {
    lines.push(`## Page ${p.page_number}`, '');
    const b = asBeatsJsonLike(p.beats_json);
    const hook = safeText(b?.one_line_hook);
    if (hook) lines.push(hook, '');
    const panels = Array.isArray(b?.panels) ? b!.panels! : [];
    if (!panels.length) {
      lines.push('_No beats_', '');
    } else {
      for (const [idx, panel] of panels.entries()) {
        const i = typeof panel?.index === 'number' ? panel.index : idx + 1;
        const action = safeText(panel?.action);
        const dialogue = safeText(panel?.dialogue);
        const composition = safeText(panel?.composition);
        const notes = safeText(panel?.notes);
        const bits = [
          action ? action : '',
          dialogue ? `**Dialogue:** ${dialogue}` : '',
          composition ? `**Composition:** ${composition}` : '',
          notes ? `**Notes:** ${notes}` : '',
        ].filter(Boolean);
        lines.push(`- **Panel ${i}**${bits.length ? `: ${bits.join(' · ')}` : ''}`);
      }
      lines.push('');
    }
  }
  return `${lines.join('\n').trim()}\n`;
}

export function formatDialogueBundleAsText(
  pages: Array<{ page_number: number; script_text: string | null }>,
): string {
  const lines: string[] = [];
  for (const p of pages) {
    lines.push(`PAGE ${p.page_number}`, '');
    lines.push((p.script_text ?? '').trim() || '(no dialogue)');
    lines.push('', '---', '');
  }
  return `${lines.join('\n').trim()}\n`;
}

export function formatDialogueBundleAsFountain(
  pages: Array<{ page_number: number; script_text: string | null }>,
): string {
  const lines: string[] = [];
  lines.push('Title: Dialogue export');
  lines.push('');
  for (const p of pages) {
    lines.push(`# Page ${p.page_number}`, '');
    lines.push((p.script_text ?? '').trim() || '[[ no dialogue ]]');
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}
