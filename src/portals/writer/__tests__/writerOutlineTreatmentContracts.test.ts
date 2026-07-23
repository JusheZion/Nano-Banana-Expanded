import { describe, expect, it } from 'vitest';
import {
  TREATMENT_CONTRACTS,
  getTreatmentContract,
  getTreatmentPageRange,
} from '../writerOutlineTreatmentContracts';
import { normalizeTreatmentSource } from '../writerOutlineTreatmentValidation';
import { OUTLINE_TREATMENT_SOURCE_26 } from './fixtures/outlineTreatmentSource';

describe('writer outline treatment contracts', () => {
  it('keeps source structure and pages immutable in preserve mode', () => {
    expect(getTreatmentContract('preserve')).toMatchObject({
      pageTolerance: 0,
      allowReorder: false,
      allowCombine: false,
      allowEnhance: false,
      allowAdd: false,
    });
  });

  it('gives organize and expand distinct page flexibility', () => {
    expect(getTreatmentContract('structure').pageTolerance).toBe(0.10);
    expect(getTreatmentContract('expand').pageTolerance).toBe(0.20);
    expect(getTreatmentPageRange('structure', 52)).toEqual({ min: 46, max: 58 });
    expect(getTreatmentPageRange('expand', 52)).toEqual({ min: 41, max: 63 });
  });

  it('clamps flexible page ranges to application limits', () => {
    expect(getTreatmentPageRange('structure', 1)).toEqual({ min: 1, max: 2 });
    expect(getTreatmentPageRange('expand', 200)).toEqual({ min: 160, max: 200 });
  });

  it('provides materially distinct user-facing descriptions', () => {
    const descriptions = Object.values(TREATMENT_CONTRACTS).map((contract) => contract.description);
    expect(new Set(descriptions).size).toBe(3);
    expect(TREATMENT_CONTRACTS.preserve.description).toMatch(/without changing beats/i);
    expect(TREATMENT_CONTRACTS.structure.description).toMatch(/every source beat/i);
    expect(TREATMENT_CONTRACTS.expand.description).toMatch(/add material/i);
  });

  it('retains a sequential 26-page target when the final page label is missing', () => {
    const source = normalizeTreatmentSource(OUTLINE_TREATMENT_SOURCE_26);
    expect(source.pageCount).toBe(26);
    expect(getTreatmentPageRange('structure', source.pageCount)).toEqual({ min: 23, max: 29 });
    expect(getTreatmentPageRange('expand', source.pageCount)).toEqual({ min: 20, max: 32 });
  });
});
