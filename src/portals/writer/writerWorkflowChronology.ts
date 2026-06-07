import type { WriterWorkspaceTabId } from '@/portals/writer/writerSearch';

export type WriterWorkflowStepId =
  | 'library'
  | 'foundation'
  | 'synopsis'
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
  hasSynopsis: boolean;
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
  { id: 'library', label: 'Library', tab: 'outline', eyebrow: 'Select' },
  { id: 'foundation', label: 'Foundation', tab: 'outline', eyebrow: 'Setup' },
  { id: 'synopsis', label: 'Synopsis', tab: 'scripts', eyebrow: 'Author source' },
  { id: 'canon', label: 'Canon', tab: 'lore', eyebrow: 'Lore' },
  { id: 'outline', label: 'Outline', tab: 'outline', eyebrow: 'Structure' },
  { id: 'pages', label: 'Pages', tab: 'outline', eyebrow: 'Rows' },
  { id: 'beats', label: 'Beats', tab: 'beats', eyebrow: 'Panels' },
  { id: 'dialogue', label: 'Dialogue', tab: 'dialogue', eyebrow: 'Script' },
  { id: 'visual', label: 'Visual Prep', tab: 'video', eyebrow: 'Imageshop' },
  { id: 'audit', label: 'Audit', tab: 'arc', eyebrow: 'Review' },
  { id: 'cockpit', label: 'Cockpit', tab: 'cockpit', eyebrow: 'Compare' },
  { id: 'export', label: 'Export', tab: 'scripts', eyebrow: 'Output' },
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
      case 'synopsis':
        return {
          ...step,
          done: ctx.hasSynopsis,
          detail: ctx.hasSynopsis ? 'Author source ready' : 'Add outline/source',
        };
      case 'canon':
        return {
          ...step,
          done: ctx.hasCanon,
          detail: ctx.hasCanon ? 'Lore included' : 'Add lore before generation',
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
          detail: ctx.hasShotPlan ? 'Shot plan saved' : 'Send page or shot plan',
        };
      case 'audit':
        return {
          ...step,
          done: ctx.hasAudit,
          detail: ctx.hasAudit ? 'Review cached' : 'Run pacing + canon',
        };
      case 'cockpit':
        return {
          ...step,
          done: false,
          detail: 'Late-stage compare',
        };
      case 'export':
        return {
          ...step,
          done: ctx.hasOutline || ctx.pagesWithBeats > 0 || ctx.pagesWithDialogue > 0,
          detail: 'Preferred + handoff files',
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
