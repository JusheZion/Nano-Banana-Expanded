import { z } from 'zod';
import {
  rebuildOutlinePasteDiagnostic,
  type OutlinePassageAssignment,
  type OutlinePasteDiagnostic,
} from './writerOutlinePasteDiagnostic';

const suggestionSchema = z.object({
  id: z.string().min(1),
  assignment: z.enum(['title', 'premise', 'act', 'page_beat', 'notes', 'unassigned']),
  act_name: z.string().max(200).optional(),
  page_target: z.number().int().min(1).max(200).optional(),
  reason: z.string().max(240),
}).strict();

const responseSchema = z.object({ suggestions: z.array(suggestionSchema).max(250) }).strict();

export type OutlineClassificationSuggestion = z.infer<typeof suggestionSchema>;

export function parseOutlineClassificationSuggestions(
  value: unknown,
  knownIds: ReadonlySet<string>,
): OutlineClassificationSuggestion[] {
  const suggestions = responseSchema.parse(value).suggestions.filter((item) => knownIds.has(item.id));
  if (new Set(suggestions.map((item) => item.id)).size !== suggestions.length) {
    throw new Error('AI returned duplicate passage IDs.');
  }
  return suggestions;
}

export function mergeOutlineClassificationSuggestions(
  diagnostic: OutlinePasteDiagnostic,
  suggestions: OutlineClassificationSuggestion[],
): OutlinePasteDiagnostic {
  const byId = new Map(suggestions.map((suggestion) => [suggestion.id, suggestion]));
  const passages = diagnostic.passages.map((passage) => {
    const suggestion = byId.get(passage.id);
    if (!suggestion) return passage;
    const assignment = suggestion.assignment as OutlinePassageAssignment;
    return {
      ...passage,
      assignment,
      provenance: 'ai' as const,
      ...(assignment === 'act' && suggestion.act_name ? { actName: suggestion.act_name } : { actName: undefined }),
      ...(assignment === 'page_beat' && suggestion.page_target ? { pageTarget: suggestion.page_target } : { pageTarget: undefined }),
      pageRange: undefined,
    };
  });
  return rebuildOutlinePasteDiagnostic(diagnostic, passages);
}
