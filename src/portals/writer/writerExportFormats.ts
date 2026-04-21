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

