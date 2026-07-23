import type { IssueOutline } from '@/shared/writer/types';

export const OUTLINE_TREATMENT_PROTECTED_TERMS = ['Pony', 'Onyx', 'Conjunction'];

export const OUTLINE_TREATMENT_SOURCE_26: IssueOutline = {
  title: 'The Conjunction',
  premise: 'Pony and Onyx must preserve the Conjunction without erasing either path.',
  acts: [
    { name: 'Act I', summary: 'The warning and refusal establish both paths.' },
    { name: 'Act II', summary: 'Separate trials reveal why both paths matter.' },
    { name: 'Act III', summary: 'Pony and Onyx reunite and choose integration.' },
  ],
  page_beats: Array.from({ length: 26 }, (_, index) => {
    const page = index + 1;
    const summary = page === 1
      ? 'Pony hears the warning beside the campfire.'
      : page === 2
        ? 'Onyx refuses the easy prophecy, causing the paths to divide.'
        : page === 25
          ? 'Pony and Onyx reunite with both lessons intact.'
          : page === 26
            ? 'The Conjunction endures because Pony and Onyx preserve both paths.'
            : `The consequence from page ${page - 1} drives Pony and Onyx through trial ${page}.`;
    return {
      ...(page === 26 ? {} : { page_target: page }),
      scene: page % 5 === 0 ? 'Dense turning point' : page % 4 === 0 ? 'Quiet visual beat' : `Sequence ${page}`,
      summary,
      emotional_turn: page === 26 ? 'Integration without erasure' : `Turn ${page}`,
    };
  }),
};
