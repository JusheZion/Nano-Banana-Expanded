import type { WriterWorkspaceTabId } from '@/portals/writer/writerSearch';

export type WriterWorkflowStepId =
  | 'dashboard'
  | 'library'
  | 'foundation'
  | 'visual_canon'
  | 'canon'
  | 'outline'
  | 'pages'
  | 'beats'
  | 'dialogue'
  | 'visual'
  | 'audit'
  | 'cockpit'
  | 'export';

export type WriterWorkflowStepDefinition = {
  id: WriterWorkflowStepId;
  label: string;
  tab: WriterWorkspaceTabId;
  eyebrow: string;
};

export type WriterWorkflowStep = WriterWorkflowStepDefinition & {
  detail: string;
  done: boolean;
};

export type WriterWorkflowContext = {
  hasSeries: boolean;
  hasIssue: boolean;
  hasFoundation: boolean;
  hasVisualCanon: boolean;
  hasCanon: boolean;
  hasOutline: boolean;
  pageCount: number;
  targetPageCount: number;
  pagesWithBeats: number;
  pagesWithDialogue: number;
  hasShotPlan: boolean;
  hasAudit: boolean;
};

export const WRITER_WORKFLOW_STEP_ORDER: WriterWorkflowStepDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', tab: 'dashboard', eyebrow: 'Start' },
  { id: 'library', label: 'Choose Story', tab: 'dashboard', eyebrow: 'Select' },
  { id: 'foundation', label: 'Foundation', tab: 'dashboard', eyebrow: 'Setup' },
  { id: 'visual_canon', label: 'Visual Canon', tab: 'visual_canon', eyebrow: 'References' },
  { id: 'canon', label: 'Story Canon', tab: 'lore', eyebrow: 'Lore' },
  { id: 'outline', label: 'Outline', tab: 'outline', eyebrow: 'Structure' },
  { id: 'pages', label: 'Pages', tab: 'outline', eyebrow: 'Rows' },
  { id: 'beats', label: 'Beats', tab: 'beats', eyebrow: 'Panels' },
  { id: 'dialogue', label: 'Dialogue', tab: 'dialogue', eyebrow: 'Script' },
  { id: 'visual', label: 'Imageshop Prep', tab: 'video', eyebrow: 'Imageshop' },
  { id: 'audit', label: 'Story Review', tab: 'arc', eyebrow: 'Review' },
  { id: 'cockpit', label: 'Compare & Review', tab: 'cockpit', eyebrow: 'Compare' },
  { id: 'export', label: 'Export', tab: 'export', eyebrow: 'Output' },
];

export function getWriterWorkflowStepByTab(tab: WriterWorkspaceTabId): WriterWorkflowStepDefinition | undefined {
  return WRITER_WORKFLOW_STEP_ORDER.find((step) => step.tab === tab && step.id !== 'library');
}

export function buildWriterWorkflowSteps(ctx: WriterWorkflowContext): WriterWorkflowStep[] {
  const hasPagesToTarget = ctx.pageCount > 0 && ctx.pageCount >= ctx.targetPageCount;
  const beatsDone = ctx.pageCount > 0 && ctx.pagesWithBeats >= ctx.pageCount;
  const dialogueDone = ctx.pageCount > 0 && ctx.pagesWithDialogue >= Math.max(1, ctx.pagesWithBeats);
  return WRITER_WORKFLOW_STEP_ORDER.map((step) => {
    switch (step.id) {
      case 'dashboard':
        return {
          ...step,
          done: ctx.hasSeries && ctx.hasIssue,
          detail: ctx.hasSeries && ctx.hasIssue ? 'Issue ready' : 'Choose a series + issue',
        };
      case 'library':
        return {
          ...step,
          done: ctx.hasSeries && ctx.hasIssue,
          detail: ctx.hasSeries && ctx.hasIssue ? 'Series + issue selected' : 'Choose series + issue',
        };
      case 'foundation':
        return {
          ...step,
          done: ctx.hasFoundation,
          detail: ctx.hasFoundation ? 'Production defaults ready' : 'Set medium + output',
        };
      case 'visual_canon':
        return {
          ...step,
          done: ctx.hasVisualCanon,
          detail: ctx.hasVisualCanon ? 'Image references attached' : 'Attach images for AI consistency',
        };
      case 'canon':
        return {
          ...step,
          done: ctx.hasCanon,
          detail: ctx.hasCanon ? 'Story lore included' : 'Choose lore for AI prompts',
        };
      case 'outline':
        return {
          ...step,
          done: ctx.hasOutline,
          detail: ctx.hasOutline ? 'Issue outline saved' : 'Generate structure',
        };
      case 'pages':
        return {
          ...step,
          done: hasPagesToTarget,
          detail: hasPagesToTarget ? `${ctx.pageCount} page rows ready` : 'Sync pages to target',
        };
      case 'beats':
        return {
          ...step,
          done: beatsDone,
          detail: `${ctx.pagesWithBeats}/${Math.max(ctx.pageCount, ctx.targetPageCount)} pages paced`,
        };
      case 'dialogue':
        return {
          ...step,
          done: dialogueDone,
          detail: `${ctx.pagesWithDialogue}/${Math.max(ctx.pagesWithBeats, ctx.pageCount)} pages scripted`,
        };
      case 'visual':
        return {
          ...step,
          done: ctx.hasShotPlan,
          detail: ctx.hasShotPlan ? 'Shot plan saved' : 'Prepare Imageshop handoff',
        };
      case 'audit':
        return {
          ...step,
          done: ctx.hasAudit,
          detail: ctx.hasAudit ? 'Review saved' : 'Run pacing and canon checks',
        };
      case 'cockpit':
        return {
          ...step,
          done: false,
          detail: 'Compare saved outputs',
        };
      case 'export':
        return {
          ...step,
          done: ctx.hasOutline || ctx.pagesWithBeats > 0 || ctx.pagesWithDialogue > 0,
          detail: 'Download handoff files',
        };
      default:
        return {
          ...step,
          done: false,
          detail: '',
        };
    }
  });
}
