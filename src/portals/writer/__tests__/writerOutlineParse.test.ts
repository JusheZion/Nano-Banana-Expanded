import { describe, expect, it } from 'vitest';
import { formatOutlineAsText, parseOutlineText } from '../writerExportFormats';

describe('parseOutlineText round-trip', () => {
  const outline = {
    title: 'Twove',
    premise: 'Two souls collide across timelines.',
    acts: [
      { name: 'Act 1', goal: 'Establish stakes', summary: 'Pony wakes in the Virtualverse.' },
      { name: 'Act 2', summary: 'The mirror cracks.' },
      { name: 'Act 3', goal: 'Resolve' },
    ],
    page_beats: [
      { page_target: 1, scene: 'Classroom', summary: 'Opening misfire.', emotional_turn: 'hope to fear' },
      { page_target: 2, summary: 'Vision escalates.' },
      { page_target: 3, scene: 'Rooftop' },
    ],
    extra_field: { keep: 'me' },
  };

  it('round-trips known fields and is idempotent on text', () => {
    const text = formatOutlineAsText(outline);
    const parsed = parseOutlineText(text);
    expect(parsed.title).toBe('Twove');
    expect(parsed.premise).toBe('Two souls collide across timelines.');
    expect(parsed.acts).toEqual(outline.acts);
    expect(parsed.page_beats).toEqual(outline.page_beats);
    // merge preserves unknown top-level fields
    const merged = { ...outline, ...parsed };
    expect((merged as any).extra_field).toEqual({ keep: 'me' });
    // text is stable through a second pass
    expect(formatOutlineAsText(merged)).toBe(text);
  });

  it('accepts a pasted numbered outline with tab-separated scene descriptions', () => {
    const parsed = parseOutlineText([
      '1\tCampfire under starry sky: Children gather around a crackling campfire.',
      '2\tMontage of historical figures / cosmic essence: The elder narrates a timeless history. (turn: Intrigue)',
      '4. Return to campfire: The children look up at the stars.',
    ].join('\n'));

    expect(parsed.page_beats).toEqual([
      {
        page_target: 1,
        scene: 'Campfire under starry sky',
        summary: 'Children gather around a crackling campfire.',
      },
      {
        page_target: 2,
        scene: 'Montage of historical figures / cosmic essence',
        summary: 'The elder narrates a timeless history.',
        emotional_turn: 'Intrigue',
      },
      {
        page_target: 4,
        scene: 'Return to campfire',
        summary: 'The children look up at the stars.',
      },
    ]);
  });
});
