import { describe, expect, it } from 'vitest';
import {
  WRITER_WORKFLOW_STEP_ORDER,
  buildWriterWorkflowSteps,
  getWriterWorkflowStepByTab,
} from '../writerWorkflowChronology';

describe('writerWorkflowChronology', () => {
  it('models the user-facing chronology from Library through Export', () => {
    expect(WRITER_WORKFLOW_STEP_ORDER.map((step) => step.label)).toEqual([
      'Dashboard',
      'Choose Story',
      'Foundation',
      'Visual Canon',
      'Story Canon',
      'Outline',
      'Pages',
      'Beats',
      'Dialogue',
      'Imageshop Prep',
      'Story Review',
      'Compare & Review',
      'Export',
    ]);
  });

  it('summarizes progress and prerequisites without treating Cockpit as the first step', () => {
    const steps = buildWriterWorkflowSteps({
      hasSeries: true,
      hasIssue: true,
      hasFoundation: true,
      hasVisualCanon: false,
      hasCanon: false,
      hasOutline: false,
      pageCount: 0,
      targetPageCount: 4,
      pagesWithBeats: 0,
      pagesWithDialogue: 0,
      hasShotPlan: false,
      hasAudit: false,
      hasComparison: false,
    });

    expect(steps.map((step) => step.label)).toEqual(WRITER_WORKFLOW_STEP_ORDER.map((step) => step.label));
    expect(steps.find((step) => step.id === 'foundation')).toMatchObject({
      done: true,
      detail: 'Production defaults ready',
    });
    expect(steps.find((step) => step.id === 'visual_canon')).toMatchObject({
      done: false,
      detail: 'Attach images for AI consistency',
    });
    expect(steps.find((step) => step.id === 'canon')).toMatchObject({
      done: false,
      detail: 'Choose lore for AI prompts',
    });
    expect(steps.find((step) => step.id === 'cockpit')).toMatchObject({
      done: false,
      detail: 'Compare saved outputs',
    });
  });

  it('counts Compare & Review only after the user marks the comparison reviewed', () => {
    const steps = buildWriterWorkflowSteps({
      hasSeries: true,
      hasIssue: true,
      hasFoundation: true,
      hasVisualCanon: true,
      hasCanon: true,
      hasOutline: true,
      pageCount: 1,
      targetPageCount: 1,
      pagesWithBeats: 1,
      pagesWithDialogue: 1,
      hasShotPlan: true,
      hasAudit: true,
      hasComparison: true,
    });

    expect(steps.find((step) => step.id === 'cockpit')).toMatchObject({
      done: true,
      detail: 'Comparison reviewed',
    });
  });

  it('maps tabs to the earliest relevant workflow step', () => {
    expect(getWriterWorkflowStepByTab('dashboard')?.id).toBe('dashboard');
    expect(getWriterWorkflowStepByTab('outline')?.id).toBe('outline');
    expect(getWriterWorkflowStepByTab('visual_canon')?.id).toBe('visual_canon');
    expect(getWriterWorkflowStepByTab('lore')?.id).toBe('canon');
    expect(getWriterWorkflowStepByTab('beats')?.id).toBe('beats');
    expect(getWriterWorkflowStepByTab('dialogue')?.id).toBe('dialogue');
    expect(getWriterWorkflowStepByTab('video')?.id).toBe('visual');
    expect(getWriterWorkflowStepByTab('arc')?.id).toBe('audit');
    expect(getWriterWorkflowStepByTab('cockpit')?.id).toBe('cockpit');
  });
});
