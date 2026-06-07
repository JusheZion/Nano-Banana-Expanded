import { describe, expect, it } from 'vitest';
import {
  WRITER_WORKFLOW_STEP_ORDER,
  buildWriterWorkflowSteps,
  getWriterWorkflowStepByTab,
} from '../writerWorkflowChronology';

describe('writerWorkflowChronology', () => {
  it('models the user-facing chronology from Library through Export', () => {
    expect(WRITER_WORKFLOW_STEP_ORDER.map((step) => step.label)).toEqual([
      'Library',
      'Foundation',
      'Synopsis',
      'Canon',
      'Outline',
      'Pages',
      'Beats',
      'Dialogue',
      'Visual Prep',
      'Audit',
      'Cockpit',
      'Export',
    ]);
  });

  it('summarizes progress and prerequisites without treating Cockpit as the first step', () => {
    const steps = buildWriterWorkflowSteps({
      hasSeries: true,
      hasIssue: true,
      hasFoundation: true,
      hasSynopsis: true,
      hasCanon: false,
      hasOutline: false,
      pageCount: 0,
      targetPageCount: 4,
      pagesWithBeats: 0,
      pagesWithDialogue: 0,
      hasShotPlan: false,
      hasAudit: false,
    });

    expect(steps.map((step) => step.label)).toEqual(WRITER_WORKFLOW_STEP_ORDER.map((step) => step.label));
    expect(steps.find((step) => step.id === 'foundation')).toMatchObject({
      done: true,
      detail: 'Production defaults ready',
    });
    expect(steps.find((step) => step.id === 'canon')).toMatchObject({
      done: false,
      detail: 'Add lore before generation',
    });
    expect(steps.find((step) => step.id === 'cockpit')).toMatchObject({
      done: false,
      detail: 'Late-stage compare',
    });
  });

  it('maps tabs to the earliest relevant workflow step', () => {
    expect(getWriterWorkflowStepByTab('outline')?.id).toBe('foundation');
    expect(getWriterWorkflowStepByTab('scripts')?.id).toBe('synopsis');
    expect(getWriterWorkflowStepByTab('lore')?.id).toBe('canon');
    expect(getWriterWorkflowStepByTab('beats')?.id).toBe('beats');
    expect(getWriterWorkflowStepByTab('dialogue')?.id).toBe('dialogue');
    expect(getWriterWorkflowStepByTab('video')?.id).toBe('visual');
    expect(getWriterWorkflowStepByTab('arc')?.id).toBe('audit');
    expect(getWriterWorkflowStepByTab('cockpit')?.id).toBe('cockpit');
  });
});
