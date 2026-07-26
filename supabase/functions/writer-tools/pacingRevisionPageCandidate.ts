const proposedBeatsJsonSchema = {
  type: 'object',
  properties: {
    panels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          action: { type: 'string' },
          composition: { type: 'string' },
          emotion: { type: 'string' },
          dialogue_placeholder: { type: 'string' },
          sfx: { type: 'string' },
        },
        required: ['action'],
      },
    },
  },
  required: ['panels'],
} as const;

export function pacingRevisionPageResponseSchema(
  includeBeats: boolean,
  includeDialogue: boolean,
) {
  return {
    type: 'object',
    properties: {
      pages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            page_id: { type: 'string' },
            page_number: { type: 'integer' },
            reason: { type: 'string' },
            ...(includeBeats ? { proposed_beats_json: proposedBeatsJsonSchema } : {}),
            ...(includeDialogue ? { proposed_script_text: { type: 'string' } } : {}),
          },
          required: [
            'page_id',
            'page_number',
            ...(includeBeats ? ['proposed_beats_json'] : []),
            ...(includeDialogue ? ['proposed_script_text'] : []),
          ],
        },
      },
    },
    required: ['pages'],
  };
}

export const PACING_REVISION_PAGE_RESPONSE_SCHEMA = pacingRevisionPageResponseSchema(true, true);

export async function generateValidatedPacingRevisionPageCandidate<T>(
  generate: (temperature: number) => Promise<unknown>,
  validate: (value: unknown) => T,
): Promise<T> {
  const firstValue = await generate(0.45);
  try {
    return validate(firstValue);
  } catch (error) {
    const first = error instanceof Error ? error.message : String(error);
    const secondValue = await generate(0.15);
    try {
      return validate(secondValue);
    } catch (secondError) {
      const second = secondError instanceof Error ? secondError.message : String(secondError);
      throw new Error(`Page candidate validation failed twice: ${first}; ${second}`);
    }
  }
}
