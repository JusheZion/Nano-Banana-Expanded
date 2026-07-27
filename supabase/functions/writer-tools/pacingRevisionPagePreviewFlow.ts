import {
  buildPacingRevisionPromptPage,
  proposedOutlinePageNumbers,
  resolvePacingRevisionPageTarget,
  type PacingRevisionPhysicalPage,
} from './pacingRevisionPageTarget.ts';
import {
  buildPacingRevisionPageChangeRow,
  type PacingRevisionChildLayer,
} from './pacingRevisionPersistence.ts';
import {
  generateValidatedPacingRevisionPageCandidate,
} from './pacingRevisionPageCandidate.ts';

export type PacingRevisionPreviewItem = {
  id: string;
  affected_page_numbers: number[];
  generation_status: string;
};

export type PacingRevisionPreviewChange = {
  id: string;
  item_id: string;
  layer: string;
  target_key: string;
  page_number: number | null;
  generation_status: string;
  decision: string;
  ai_proposal: unknown;
  edited_candidate: unknown;
  dependency_ids: string[];
};

export type PacingRevisionPreviewCandidate = {
  page_id: string;
  page_number: number;
  reason?: string;
  proposed_beats_json?: unknown;
  proposed_script_text?: string;
};

export async function executePacingRevisionPagePreviewFlow(input: {
  requestedPageId: string | null;
  requestedPageNumber: number;
  physicalPages: PacingRevisionPhysicalPage[];
  proposedOutline: unknown;
  itemRows: PacingRevisionPreviewItem[];
  existingChanges: PacingRevisionPreviewChange[];
  includeBeats: boolean;
  includeDialogue: boolean;
  createPromptPageId: () => string;
  hashValue: (value: unknown) => Promise<string>;
  generate: (
    promptPage: ReturnType<typeof buildPacingRevisionPromptPage>,
    temperature: number,
  ) => Promise<unknown>;
  parseResponse: (value: unknown) => { pages: PacingRevisionPreviewCandidate[] };
  persistChanges: (
    rows: Array<Record<string, unknown>>,
  ) => Promise<Array<Record<string, unknown>>>;
}) {
  if (input.includeBeats === input.includeDialogue) {
    throw new Error('Exactly one page child layer must be selected');
  }
  const target = resolvePacingRevisionPageTarget({
    requestedPageId: input.requestedPageId,
    requestedPageNumber: input.requestedPageNumber,
    physicalPages: input.physicalPages,
    proposedPageNumbers: proposedOutlinePageNumbers(input.proposedOutline),
  });
  const owningItems = input.itemRows.filter((item) =>
    item.affected_page_numbers.includes(target.pageNumber)
  );
  const item = owningItems.find((candidate) => candidate.generation_status !== 'locked');
  if (!item) {
    throw new Error(
      owningItems.length > 0 ? 'Affected Revision Item is locked' : 'No Revision Item owns this page',
    );
  }

  const itemChanges = input.existingChanges.filter((change) => change.item_id === item.id);
  const existingPageChange = (layer: PacingRevisionChildLayer) =>
    itemChanges.find((entry) => entry.layer === layer && entry.target_key === target.targetKey);
  const beatsChange = existingPageChange('beats');
  const dialogueChange = existingPageChange('dialogue');
  if (
    (input.includeBeats && beatsChange?.generation_status === 'locked')
    || (input.includeDialogue && dialogueChange?.generation_status === 'locked')
  ) {
    throw new Error('Selected page layer is locked');
  }

  const outlineDependencyIds = itemChanges
    .filter((change) => {
      if (change.layer !== 'outline') return false;
      if (target.kind === 'physical') return true;
      return change.page_number === target.pageNumber
        && ['ready', 'applied'].includes(change.generation_status)
        && change.decision !== 'rejected';
    })
    .map((change) => change.id);
  if (target.kind === 'virtual' && outlineDependencyIds.length === 0) {
    throw new Error('Virtual Page Beats require an applicable Outline change');
  }

  let pageHasReadyBeats = Boolean(
    beatsChange && ['ready', 'applied'].includes(beatsChange.generation_status)
  );
  let pageHasReadyDialogue = Boolean(
    dialogueChange && ['ready', 'applied'].includes(dialogueChange.generation_status)
  );
  const effectiveBeatsCandidate = beatsChange?.edited_candidate ?? beatsChange?.ai_proposal;
  if (
    target.kind === 'virtual'
    && input.includeDialogue
    && !beatsChange?.dependency_ids.some((id) => outlineDependencyIds.includes(id))
  ) {
    throw new Error('Virtual Page Beats are not backed by the applicable Outline change');
  }
  if (
    input.includeDialogue
    && (!pageHasReadyBeats || effectiveBeatsCandidate == null)
  ) {
    throw new Error('Page Beats candidate is required before Dialogue');
  }

  const basePromptPage = buildPacingRevisionPromptPage(
    target,
    input.physicalPages,
    input.createPromptPageId(),
  );
  const promptPage = input.includeDialogue
    ? { ...basePromptPage, beats_json: effectiveBeatsCandidate }
    : basePromptPage;
  const candidate = await generateValidatedPacingRevisionPageCandidate(
    (temperature) => input.generate(promptPage, temperature),
    (value) => {
      const parsed = input.parseResponse(value);
      if (parsed.pages.length !== 1) throw new Error('Exactly one page candidate is required');
      const onlyPage = parsed.pages[0]!;
      if (onlyPage.page_id !== promptPage.id || onlyPage.page_number !== target.pageNumber) {
        throw new Error('Page candidate does not match the requested page');
      }
      if (input.includeBeats && !onlyPage.proposed_beats_json) {
        throw new Error('Page Beats candidate is required');
      }
      if (input.includeDialogue && !onlyPage.proposed_script_text?.trim()) {
        throw new Error('Dialogue candidate is required');
      }
      return onlyPage;
    },
  );

  const now = new Date().toISOString();
  const changeRows: Array<Record<string, unknown>> = [];
  let beatsChangeId: string | null = beatsChange?.id ?? null;
  if (input.includeBeats && candidate.proposed_beats_json) {
    beatsChangeId = beatsChange?.id ?? crypto.randomUUID();
    pageHasReadyBeats = true;
    pageHasReadyDialogue = false;
    const currentValue = target.kind === 'virtual' ? null : basePromptPage.beats_json;
    changeRows.push(buildPacingRevisionPageChangeRow({
      id: beatsChangeId,
      itemId: item.id,
      layer: 'beats',
      target,
      currentValue,
      aiProposal: candidate.proposed_beats_json,
      dependencyIds: outlineDependencyIds,
      reason: candidate.reason?.trim() || 'Pacing-aligned Page Beats revision.',
      sourceFingerprint: await input.hashValue(currentValue),
      now,
    }));
  }
  if (input.includeDialogue && candidate.proposed_script_text) {
    pageHasReadyDialogue = true;
    const currentValue = target.kind === 'virtual' ? null : basePromptPage.script_text;
    changeRows.push(buildPacingRevisionPageChangeRow({
      id: dialogueChange?.id ?? crypto.randomUUID(),
      itemId: item.id,
      layer: 'dialogue',
      target,
      currentValue,
      aiProposal: candidate.proposed_script_text,
      dependencyIds: beatsChangeId ? [beatsChangeId] : outlineDependencyIds,
      reason: candidate.reason?.trim() || 'Pacing-aligned Dialogue revision.',
      sourceFingerprint: await input.hashValue(currentValue),
      now,
    }));
  }

  const persistedChanges = await input.persistChanges(changeRows);
  return {
    target,
    item,
    promptPage,
    candidate,
    persistedChanges,
    changeRows,
    pageHasReadyBeats,
    pageHasReadyDialogue,
  };
}

export type PacingRevisionPagePreviewFlowResult = Awaited<
  ReturnType<typeof executePacingRevisionPagePreviewFlow>
>;
