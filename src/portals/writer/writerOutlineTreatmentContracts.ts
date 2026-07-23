export const WRITER_OUTLINE_TREATMENT_MODES = ['preserve', 'structure', 'expand'] as const;

export type WriterOutlineTreatmentMode = typeof WRITER_OUTLINE_TREATMENT_MODES[number];

export type WriterOutlineTreatmentContract = {
  label: string;
  description: string;
  pageTolerance: number;
  allowReorder: boolean;
  allowCombine: boolean;
  allowEnhance: boolean;
  allowAdd: boolean;
};

export const TREATMENT_CONTRACTS: Record<
  WriterOutlineTreatmentMode,
  WriterOutlineTreatmentContract
> = {
  preserve: {
    label: 'Keep my order',
    description: 'Improve language and formatting without changing beats, order, pages, events, or outcomes.',
    pageTolerance: 0,
    allowReorder: false,
    allowCombine: false,
    allowEnhance: false,
    allowAdd: false,
  },
  structure: {
    label: 'Organize and polish',
    description: 'Reorganize and strengthen pacing while keeping every source beat traceable.',
    pageTolerance: 0.10,
    allowReorder: true,
    allowCombine: true,
    allowEnhance: true,
    allowAdd: true,
  },
  expand: {
    label: 'Expand creatively',
    description: 'Enhance existing beats and add material while preserving every original event and outcome.',
    pageTolerance: 0.20,
    allowReorder: true,
    allowCombine: true,
    allowEnhance: true,
    allowAdd: true,
  },
};

export function getTreatmentContract(
  mode: WriterOutlineTreatmentMode,
): WriterOutlineTreatmentContract {
  return TREATMENT_CONTRACTS[mode];
}

export function getTreatmentPageRange(
  mode: WriterOutlineTreatmentMode,
  sourcePageCount: number,
): { min: number; max: number } {
  const pages = Math.max(1, Math.min(200, Math.trunc(sourcePageCount)));
  const tolerance = getTreatmentContract(mode).pageTolerance;
  return {
    min: Math.max(1, Math.floor(pages * (1 - tolerance))),
    max: Math.min(200, Math.ceil(pages * (1 + tolerance))),
  };
}
