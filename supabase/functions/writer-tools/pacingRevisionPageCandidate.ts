export const PACING_REVISION_PAGE_RESPONSE_SCHEMA = {
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
          proposed_beats_json: {
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
          },
          proposed_script_text: { type: 'string' },
        },
        required: ['page_id', 'page_number'],
      },
    },
  },
  required: ['pages'],
} as const;

export async function generateValidatedPacingRevisionPageCandidate<T>(
  generate: (temperature: number) => Promise<unknown>,
  validate: (value: unknown) => T,
): Promise<T> {
  let firstError: unknown;
  try {
    return validate(await generate(0.45));
  } catch (error) {
    firstError = error;
  }
  try {
    return validate(await generate(0.15));
  } catch (error) {
    const first = firstError instanceof Error ? firstError.message : String(firstError);
    const second = error instanceof Error ? error.message : String(error);
    throw new Error(`Page candidate validation failed twice: ${first}; ${second}`);
  }
}
