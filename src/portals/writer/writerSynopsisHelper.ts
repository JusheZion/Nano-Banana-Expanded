/**
 * Build a structured synopsis string from worksheet fields for writer_issues.synopsis / outline_issue context.
 */

export type SynopsisHelperParts = {
  logline: string;
  mustHappen: string;
  pacingNotes: string;
  castGoals: string;
  factions: string;
  locations: string;
  rules: string;
};

export const EMPTY_SYNOPSIS_HELPER_PARTS: SynopsisHelperParts = {
  logline: '',
  mustHappen: '',
  pacingNotes: '',
  castGoals: '',
  factions: '',
  locations: '',
  rules: '',
};

const NOTES_KEY = 'synopsis_helper';

export function readSynopsisHelperFromNotes(notes: Record<string, unknown> | undefined): SynopsisHelperParts {
  if (!notes || typeof notes !== 'object') return { ...EMPTY_SYNOPSIS_HELPER_PARTS };
  const raw = notes[NOTES_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_SYNOPSIS_HELPER_PARTS };
  const o = raw as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    logline: s(o.logline),
    mustHappen: s(o.must_happen),
    pacingNotes: s(o.pacing_notes),
    castGoals: s(o.cast_goals),
    factions: s(o.factions),
    locations: s(o.locations),
    rules: s(o.rules),
  };
}

export function synopsisHelperPartsToNotesJson(parts: SynopsisHelperParts): Record<string, unknown> {
  return {
    [NOTES_KEY]: {
      logline: parts.logline,
      must_happen: parts.mustHappen,
      pacing_notes: parts.pacingNotes,
      cast_goals: parts.castGoals,
      factions: parts.factions,
      locations: parts.locations,
      rules: parts.rules,
    },
  };
}

/** Merge synopsis_helper blob into existing issue notes (preserves writer_tool_cache etc.). */
export function mergeSynopsisHelperIntoNotes(
  existingNotes: Record<string, unknown>,
  parts: SynopsisHelperParts,
): Record<string, unknown> {
  return {
    ...existingNotes,
    ...synopsisHelperPartsToNotesJson(parts),
  };
}

export function buildSynopsisDocumentFromParts(parts: SynopsisHelperParts): string {
  const blocks: string[] = [];
  const t = (s: string) => s.trim();

  if (t(parts.logline)) {
    blocks.push(`LOGLINE\n${t(parts.logline)}`);
  }
  if (t(parts.mustHappen)) {
    blocks.push(
      `MUST-HAPPEN BEATS (in order — the outline should map these across pages, one new development per beat)\n${t(parts.mustHappen)}`,
    );
  }
  if (t(parts.pacingNotes)) {
    blocks.push(`PACING / STRUCTURE\n${t(parts.pacingNotes)}`);
  }
  if (t(parts.castGoals)) {
    blocks.push(`CAST (this issue)\n${t(parts.castGoals)}`);
  }
  if (t(parts.factions)) {
    blocks.push(`FACTIONS / THREATS\n${t(parts.factions)}`);
  }
  if (t(parts.locations)) {
    blocks.push(`LOCATIONS / SETS\n${t(parts.locations)}`);
  }
  if (t(parts.rules)) {
    blocks.push(`RULES FOR THE OUTLINE\n${t(parts.rules)}`);
  }

  return blocks.join('\n\n').trim();
}
