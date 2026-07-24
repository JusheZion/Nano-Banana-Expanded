export const PAGE_BEATS_GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    page_number_ref: { type: 'integer' },
    one_line_hook: { type: 'string' },
    characters: {
      type: 'array',
      items: { type: 'string' },
    },
    locations: {
      type: 'array',
      items: { type: 'string' },
    },
    art_style: { type: 'string' },
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

export async function generatePageBeatsJsonWithMalformedRetry<T>(
  generate: (temperature: number) => Promise<T>,
): Promise<T> {
  try {
    return await generate(0.65);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/not valid json|invalid json from gemini/i.test(message)) {
      throw error;
    }
    return generate(0.15);
  }
}
