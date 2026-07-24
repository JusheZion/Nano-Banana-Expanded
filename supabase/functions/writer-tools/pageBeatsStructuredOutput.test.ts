import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  generatePageBeatsJsonWithMalformedRetry,
  PAGE_BEATS_GEMINI_RESPONSE_SCHEMA,
} from './pageBeatsStructuredOutput';

const writerToolsSource = readFileSync(
  join(process.cwd(), 'supabase/functions/writer-tools/index.ts'),
  'utf8',
);

describe('Page Beats structured output boundary', () => {
  it('constrains Page Beats generation with a response schema', () => {
    expect(writerToolsSource).toContain(
      'responseSchema: PAGE_BEATS_GEMINI_RESPONSE_SCHEMA',
    );
  });

  it('retries malformed model JSON once before rejecting the page', () => {
    expect(writerToolsSource).toContain(
      'generatePageBeatsJsonWithMalformedRetry',
    );
  });

  it('requires a panels array whose entries contain an action', () => {
    expect(PAGE_BEATS_GEMINI_RESPONSE_SCHEMA.required).toContain('panels');
    expect(
      PAGE_BEATS_GEMINI_RESPONSE_SCHEMA.properties.panels.items.required,
    ).toContain('action');
  });

  it('uses a lower-temperature second attempt after malformed JSON', async () => {
    const temperatures: number[] = [];
    const result = await generatePageBeatsJsonWithMalformedRetry(
      async (temperature) => {
        temperatures.push(temperature);
        if (temperatures.length === 1) {
          throw new Error('Model returned text that is not valid JSON');
        }
        return { panels: [{ action: 'Left half of the spread.' }] };
      },
    );

    expect(result).toEqual({
      panels: [{ action: 'Left half of the spread.' }],
    });
    expect(temperatures).toEqual([0.65, 0.15]);
  });

  it('does not retry a permanent generation failure', async () => {
    const temperatures: number[] = [];

    await expect(
      generatePageBeatsJsonWithMalformedRetry(async (temperature) => {
        temperatures.push(temperature);
        throw new Error('Gemini HTTP 401: invalid key');
      }),
    ).rejects.toThrow('Gemini HTTP 401');

    expect(temperatures).toEqual([0.65]);
  });
});
