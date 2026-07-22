# Writer Outline Paste Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make clipboard/file outline intake lossless and reviewable in Simple Workflow, provide a complete mapping wizard in Advanced Tools, and require editable review before AI output becomes official.

**Architecture:** Add a pure diagnostic parser alongside the existing round-trip parser, then build focused React surfaces around a shared review session model. Keep deterministic recognition local, add optional AI mapping and outline-preview modes to `writer-tools`, and persist only explicit user-approved results. Store user preferences locally, preserve outline versions through existing Writer tables/snapshot helpers, and integrate the new surfaces into `WriterPortal` without expanding its parsing responsibilities.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Vitest/Testing Library, Supabase Postgres/Edge Functions, Zod, existing Writer APIs and Tooltip components.

**Approved design:** `docs/superpowers/specs/2026-07-22-writer-outline-paste-review-design.md`

---

## Risk and dependency preflight

- Cloudflare deploy requires current Wrangler authentication; Supabase Edge Function deploy requires authenticated Supabase CLI/MCP access to the correct project.
- Signed-in browser QA requires the dedicated QA account described by the private Codex QA note; credentials must not enter repository files, logs, commits, or PR text.
- `outline_issue` currently inserts immediately. The preview work must split generation from persistence without changing the legacy request behavior until the client migrates.
- The worktree may contain user changes. Record `git status --short` and do not stage unrelated paths.
- Parser/session code must remain pure and independently testable; `WriterPortal.tsx` should orchestrate rather than absorb new parsing/UI logic.
- Fallback: if an Edge Function deployment is blocked, finish and verify local client/schema changes, clearly mark live AI preview QA blocked by access, and do not claim production completion.

## File responsibility map

| Path | Responsibility |
| --- | --- |
| `src/portals/writer/writerOutlinePasteReview.ts` | Diagnostic parsing, passage ranges, validation, assignment mutations, and proposed-outline construction. |
| `src/portals/writer/writerOutlinePastePreferences.ts` | Validated local preference persistence and defaults. |
| `src/portals/writer/writerOutlineTemplates.ts` | Plain-text/Markdown template contents and filenames. |
| `src/portals/writer/WriterOutlinePasteReview.tsx` | Simple Workflow review dialog/surface and manual assignment. |
| `src/portals/writer/WriterOutlineImportWizard.tsx` | Advanced Tools source/map/validate/preview workflow. |
| `src/portals/writer/WriterOutlineTreatmentReview.tsx` | Editable current-versus-proposed AI treatment review. |
| `src/portals/writer/WriterOutlinePasteSettings.tsx` | Shared local/global preference controls and first-use guidance reset. |
| `src/portals/writer/WriterPortal.tsx` | Entry points, state orchestration, save/promote integration, and user feedback. |
| `src/portals/writer/writerExportFormats.ts` | Existing canonical plain-text formatting/parser compatibility; delegate diagnostics without breaking exports. |
| `src/portals/writer/writerHelpRegistry.tsx` | Concise tooltip/help copy. |
| `src/shared/writer/types.ts` and `schemas.ts` | AI classification/outline preview request-response contracts. |
| `supabase/functions/_shared/writerSchemas.ts` | Edge-side mirror of Writer contracts. |
| `supabase/functions/writer-tools/index.ts` | Preview-only AI mapping/generation and explicit outline promotion. |
| `src/shared/api/arcsWriterRoom.ts` | Insert an approved outline version without mutating prior rows. |
| `public/templates/writer-outline-template.txt` / `.md` | Downloadable human-readable templates. |
| `walkthrough.md` | Immediate implementation record after meaningful work. |

## Pass 1: Lossless diagnostic parser

**Objective:** Produce a deterministic diagnostic result that accounts for every non-empty source passage.

**Acceptance criteria:** Known formats retain current behavior; unknown prose is returned verbatim as Unassigned Text; conflicts and inferred page count are explicit; every passage has provenance.

**Files:**
- Create: `src/portals/writer/writerOutlinePasteReview.ts`
- Create: `src/portals/writer/__tests__/writerOutlinePasteReview.test.ts`
- Modify: `src/portals/writer/writerExportFormats.ts`

- [ ] **Step 1: Write failing diagnostic tests** covering a mixed paste, prose-only paste, Roman numeral Acts, duplicates, gaps, and text-accounting.

```ts
const result = analyzeOutlinePaste('TITLE: Twove\nAct III - Return\nClosing reflection without a label');
expect(result.passages.map((p) => p.text)).toEqual([
  'TITLE: Twove',
  'Act III - Return',
  'Closing reflection without a label',
]);
expect(result.passages.at(-1)).toMatchObject({ assignment: 'unassigned', provenance: 'deterministic' });
expect(result.requiresReview).toBe(true);
```

- [ ] **Step 2: Run the focused test and verify RED.**

Run: `npm run test -- --run src/portals/writer/__tests__/writerOutlinePasteReview.test.ts`

Expected: FAIL because `analyzeOutlinePaste` does not exist.

- [ ] **Step 3: Add the shared diagnostic types and pure analyzer.**

```ts
export type OutlinePassageAssignment = 'title' | 'premise' | 'act' | 'page_beat' | 'notes' | 'unassigned';
export type OutlineAssignmentProvenance = 'deterministic' | 'user' | 'ai';
export type OutlinePastePassage = {
  id: string;
  text: string;
  startLine: number;
  endLine: number;
  assignment: OutlinePassageAssignment;
  provenance: OutlineAssignmentProvenance;
  actName?: string;
  pageTarget?: number;
};
export type OutlinePasteDiagnostic = {
  originalText: string;
  passages: OutlinePastePassage[];
  proposedOutline: Record<string, unknown>;
  warnings: Array<{ code: 'duplicate_page' | 'page_gap' | 'unassigned'; message: string; passageIds: string[] }>;
  inferredPageCount: number | null;
  requiresReview: boolean;
};
export function analyzeOutlinePaste(text: string): OutlinePasteDiagnostic;
export function assignOutlinePassages(
  diagnostic: OutlinePasteDiagnostic,
  passageIds: string[],
  assignment: OutlinePassageAssignment,
  metadata?: { actName?: string; firstPageTarget?: number },
): OutlinePasteDiagnostic;
```

- [ ] **Step 4: Reuse existing Act/beat parsing helpers instead of duplicating regex contracts.** Export or relocate the smallest pure helpers necessary, while keeping `parseOutlineText(text)` backward compatible.

- [ ] **Step 5: Run focused parser suites and verify GREEN.**

Run: `npm run test -- --run src/portals/writer/__tests__/writerOutlinePasteReview.test.ts src/portals/writer/__tests__/writerOutlineParse.test.ts`

Expected: both files pass; every non-empty source passage is represented once.

- [ ] **Step 6: Commit the pass.**

```bash
git add src/portals/writer/writerOutlinePasteReview.ts src/portals/writer/writerExportFormats.ts src/portals/writer/__tests__/writerOutlinePasteReview.test.ts
git commit -m "feat: add lossless outline paste diagnostics"
```

**Smoke test:** Run the two focused suites above.

**Result summary:** Record counts and confirm no source text was dropped. Do not continue until green.

**Rollback:** Revert this isolated commit; legacy `parseOutlineText` remains the active UI path until Pass 4.

## Pass 2: Preferences, templates, and help copy

**Objective:** Establish conservative persisted defaults and downloadable format guidance before exposing the new workflow.

**Acceptance criteria:** Defaults are Review only when needed, AI off, first-use tips on; invalid storage falls back safely; TXT/Markdown templates demonstrate optional Acts and ordinary prose.

**Files:**
- Create: `src/portals/writer/writerOutlinePastePreferences.ts`
- Create: `src/portals/writer/writerOutlineTemplates.ts`
- Create: `src/portals/writer/__tests__/writerOutlinePastePreferences.test.ts`
- Create: `src/portals/writer/__tests__/writerOutlineTemplates.test.ts`
- Create: `public/templates/writer-outline-template.txt`
- Create: `public/templates/writer-outline-template.md`
- Modify: `src/portals/writer/writerHelpRegistry.tsx`

- [ ] **Step 1: Write failing preference/template tests.**

```ts
expect(loadOutlinePastePreferences(storage)).toEqual({
  reviewFrequency: 'when_needed',
  aiClassification: 'off',
  showFirstUseGuidance: true,
});
expect(WRITER_OUTLINE_TEXT_TEMPLATE).toContain('Act III —');
expect(WRITER_OUTLINE_MARKDOWN_TEMPLATE).toContain('Acts are optional');
```

- [ ] **Step 2: Run tests and verify RED.**

Run: `npm run test -- --run src/portals/writer/__tests__/writerOutlinePastePreferences.test.ts src/portals/writer/__tests__/writerOutlineTemplates.test.ts`

- [ ] **Step 3: Implement validated persistence and template exports.**

```ts
export type OutlinePastePreferences = {
  reviewFrequency: 'always' | 'when_needed' | 'never_interrupt';
  aiClassification: 'off' | 'suggest' | 'classify_with_review';
  showFirstUseGuidance: boolean;
};
export const DEFAULT_OUTLINE_PASTE_PREFERENCES: OutlinePastePreferences = {
  reviewFrequency: 'when_needed',
  aiClassification: 'off',
  showFirstUseGuidance: true,
};
export function loadOutlinePastePreferences(storage: Pick<Storage, 'getItem'>): OutlinePastePreferences;
export function saveOutlinePastePreferences(storage: Pick<Storage, 'setItem'>, value: OutlinePastePreferences): void;
```

- [ ] **Step 4: Add tooltip strings** for review frequency, AI provenance, Unassigned Text, Restore original, Keep unstructured, templates, and first-use guidance. Essential instructions must also exist as visible text.

- [ ] **Step 5: Run focused tests and verify GREEN.**

- [ ] **Step 6: Commit the pass.**

```bash
git add src/portals/writer/writerOutlinePastePreferences.ts src/portals/writer/writerOutlineTemplates.ts src/portals/writer/writerHelpRegistry.tsx src/portals/writer/__tests__/writerOutlinePastePreferences.test.ts src/portals/writer/__tests__/writerOutlineTemplates.test.ts public/templates/writer-outline-template.txt public/templates/writer-outline-template.md
git commit -m "feat: add outline paste preferences and templates"
```

**Smoke test:** Focused preference/template tests plus `git diff --check`.

**Result summary:** Record default/fallback/template assertions.

**Rollback:** Revert the pass; no active UI depends on these files yet.

## Pass 3: Simple Workflow review component

**Objective:** Build the accessible lossless review UI independently from persistence.

**Acceptance criteria:** Users can select one/many passages, assign them manually with AI off, enter Act/page metadata, restore, cancel, keep unstructured, or apply; official data is not mutated inside the component.

**Files:**
- Create: `src/portals/writer/WriterOutlinePasteReview.tsx`
- Create: `src/portals/writer/__tests__/WriterOutlinePasteReview.test.tsx`

- [ ] **Step 1: Write failing component tests** for focus entry/return, recognition summary, multi-select assignment, sequential page numbering, dismissible guidance, Escape, and all actions.

```tsx
render(<WriterOutlinePasteReview diagnostic={diagnostic} preferences={defaults} onApply={onApply} onKeepUnstructured={onKeep} onCancel={onCancel} onPreferencesChange={onPreferencesChange} />);
await user.click(screen.getByRole('checkbox', { name: /closing reflection/i }));
await user.selectOptions(screen.getByLabelText(/assign selected text/i), 'notes');
expect(screen.getByText(/nothing has been discarded/i)).toBeVisible();
```

- [ ] **Step 2: Run the component test and verify RED.**

- [ ] **Step 3: Implement the controlled component** with these exact public props:

```ts
type WriterOutlinePasteReviewProps = {
  diagnostic: OutlinePasteDiagnostic;
  preferences: OutlinePastePreferences;
  busy?: boolean;
  error?: string | null;
  onApply(diagnostic: OutlinePasteDiagnostic): void;
  onKeepUnstructured(originalText: string): void;
  onCancel(): void;
  onPreferencesChange(next: OutlinePastePreferences): void;
};
```

- [ ] **Step 4: Add native checkbox/select/input controls, `role="dialog"`, labelled status regions, focus management, and responsive stacking.** Tooltips supplement visible labels; they do not contain exclusive information.

- [ ] **Step 5: Run component and overlay accessibility suites.**

Run: `npm run test -- --run src/portals/writer/__tests__/WriterOutlinePasteReview.test.tsx src/portals/writer/__tests__/writerOverlaysAccessibility.test.tsx`

- [ ] **Step 6: Commit the pass.**

```bash
git add src/portals/writer/WriterOutlinePasteReview.tsx src/portals/writer/__tests__/WriterOutlinePasteReview.test.tsx
git commit -m "feat: add accessible outline paste review"
```

**Smoke test:** Component plus overlay accessibility suites.

**Result summary:** Confirm manual assignment works without AI and all exits preserve or explicitly return the source.

**Rollback:** Revert the component commit; it is not wired into WriterPortal yet.

## Audit 1: Passes 1–3

- [ ] Map every diagnostic field to a rendered or deliberately internal use.
- [ ] Confirm each non-empty line is either recognized or Unassigned.
- [ ] Run scoped lint on new files: `npm run lint -- --quiet src/portals/writer/writerOutlinePasteReview.ts src/portals/writer/WriterOutlinePasteReview.tsx src/portals/writer/writerOutlinePastePreferences.ts src/portals/writer/writerOutlineTemplates.ts`.
- [ ] Check keyboard-only operation at 1280px and 390px in the local app.
- [ ] Record audit findings in this plan and resolve failures before Pass 4.

## Pass 4: Integrate safe paste, settings, downloads, and recovery

**Objective:** Replace silent Simple Workflow conversion with diagnostic review and explicit persistence.

**Acceptance criteria:** Paste triggers review according to preference; Never interrupt keeps uncertain source unstructured; Apply creates a new official version/snapshot and syncs approved AI source; failures preserve review state.

**Files:**
- Create: `src/portals/writer/WriterOutlinePasteSettings.tsx`
- Create: `src/portals/writer/__tests__/WriterOutlinePasteSettings.test.tsx`
- Modify: `src/portals/writer/WriterPortal.tsx`
- Modify: `src/shared/api/arcsWriterRoom.ts`
- Modify: `src/portals/writer/__tests__/writerStorySnapshots.test.ts`

- [ ] **Step 1: Write failing orchestration tests** for always/when-needed/never behavior, apply/save failure, local/global settings synchronization, template downloads, immediate undo, and locked source.

```tsx
fireEvent.paste(screen.getByRole('textbox', { name: /source outline/i }), {
  clipboardData: { getData: () => 'Page 1 — Opening\nUnlabelled closing reflection' },
});
expect(await screen.findByRole('dialog', { name: /review what the outline recognized/i })).toBeVisible();
expect(screen.getByText('Unlabelled closing reflection')).toBeVisible();
expect(createWriterOutlineVersion).not.toHaveBeenCalled();
```

- [ ] **Step 2: Add an insert-only approved-outline API.**

```ts
export async function createWriterOutlineVersion(input: {
  issueId: string;
  outlineJson: Record<string, unknown>;
  sourceMode: 'paste_review' | 'outline_import' | 'ai_treatment';
}): Promise<{ ok: true; row: WriterIssueOutlineRow } | { ok: false; error: string }>;
```

- [ ] **Step 3: Add controlled review state in `WriterPortal`.** The textarea `onPaste` reads `text/plain`, analyzes it, calls `preventDefault()`, and either opens review or preserves it as unstructured according to preference. The direct editor Save path also analyzes before converting.

```tsx
const handleOutlinePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
  const pasted = event.clipboardData.getData('text/plain');
  if (!pasted) return;
  event.preventDefault();
  const diagnostic = analyzeOutlinePaste(pasted);
  if (shouldReviewOutlinePaste(diagnostic, outlinePastePreferences.reviewFrequency)) {
    setOutlinePasteDiagnostic(diagnostic);
    return;
  }
  setAuthorOutlineText(pasted);
};
```

- [ ] **Step 4: Apply transaction ordering:** snapshot current outline, insert approved version, sync canonical approved source, refresh rows, expose Undo. On partial failure, retain the diagnostic and show which save failed.

- [ ] **Step 5: Add local Paste settings, a matching Story Settings section, Format guide, and `.txt`/`.md` download links.** Both settings surfaces consume the same preference state.

- [ ] **Step 6: Run focused integration tests and Writer snapshot tests.**

Run: `npm run test -- --run src/portals/writer/__tests__/WriterOutlinePasteReview.test.tsx src/portals/writer/__tests__/WriterOutlinePasteSettings.test.tsx src/portals/writer/__tests__/writerStorySnapshots.test.ts src/portals/writer/__tests__/writerOutlineParse.test.ts`

- [ ] **Step 7: Commit the pass.**

```bash
git add src/portals/writer/WriterOutlinePasteSettings.tsx src/portals/writer/WriterPortal.tsx src/shared/api/arcsWriterRoom.ts src/portals/writer/__tests__/WriterOutlinePasteSettings.test.tsx src/portals/writer/__tests__/writerStorySnapshots.test.ts
git commit -m "feat: integrate safe outline paste review"
```

**Smoke test:** Paste mixed-format text locally, manually assign with AI off, apply, undo, and confirm reload persistence.

**Result summary:** Record version numbers before/apply/undo and verify original text survives.

**Rollback:** Revert the integration commit; earlier parser/UI commits remain dormant and legacy saving returns.

## Pass 5: Advanced Tools import wizard

**Objective:** Add source/map/validate/preview import with draft preservation.

**Acceptance criteria:** Paste/TXT/Markdown reach the same diagnostic model; bulk mapping, ordering, page ranges, validation, Back, Save draft, Cancel, Restore original, and explicit import work.

**Files:**
- Create: `src/portals/writer/WriterOutlineImportWizard.tsx`
- Create: `src/portals/writer/writerOutlineImportDraft.ts`
- Create: `src/portals/writer/__tests__/WriterOutlineImportWizard.test.tsx`
- Create: `src/portals/writer/__tests__/writerOutlineImportDraft.test.ts`
- Modify: `src/portals/writer/WriterPortal.tsx`
- Modify: `src/portals/writer/writerFileInput.ts`

- [ ] **Step 1: Write failing tests** for the four wizard steps, file parity, bulk assignment, page ranges, validation, draft reload, unsaved-close confirmation, and import rollback.

```tsx
render(<WriterOutlineImportWizard issueId="issue-1" initialDiagnostic={diagnostic} onImport={onImport} onCancel={onCancel} />);
await user.click(screen.getByRole('button', { name: /map sections/i }));
await user.click(screen.getByRole('checkbox', { name: /pages 46–53/i }));
await user.selectOptions(screen.getByLabelText(/assign selected text/i), 'page_beat');
expect(screen.getByText(/pages 46 through 53 mapped/i)).toBeVisible();
```

- [ ] **Step 2: Define the draft contract.**

```ts
export type OutlineImportDraft = {
  issueId: string;
  step: 'source' | 'map' | 'validate' | 'preview';
  diagnostic: OutlinePasteDiagnostic;
  updatedAt: string;
};
export function loadOutlineImportDraft(storage: Pick<Storage, 'getItem'>, issueId: string): OutlineImportDraft | null;
export function saveOutlineImportDraft(storage: Pick<Storage, 'setItem'>, draft: OutlineImportDraft): void;
export function clearOutlineImportDraft(storage: Pick<Storage, 'removeItem'>, issueId: string): void;
```

- [ ] **Step 3: Implement the wizard as a controlled component** and add an Advanced Tools **Import outline** entry point. Do not hide core actions in context menus; visible buttons are primary.

```ts
type WriterOutlineImportWizardProps = {
  issueId: string;
  initialDiagnostic: OutlinePasteDiagnostic;
  savedDraft?: OutlineImportDraft | null;
  busy?: boolean;
  error?: string | null;
  onSaveDraft(draft: OutlineImportDraft): void;
  onImport(diagnostic: OutlinePasteDiagnostic): void;
  onCancel(): void;
};
```

- [ ] **Step 4: Route `.txt` and `.md` through the same analyzer** and reject other extensions with a plain-language message while leaving existing text untouched.

- [ ] **Step 5: Run focused wizard/file tests and verify GREEN.**

- [ ] **Step 6: Commit the pass.**

```bash
git add src/portals/writer/WriterOutlineImportWizard.tsx src/portals/writer/writerOutlineImportDraft.ts src/portals/writer/WriterPortal.tsx src/portals/writer/writerFileInput.ts src/portals/writer/__tests__/WriterOutlineImportWizard.test.tsx src/portals/writer/__tests__/writerOutlineImportDraft.test.ts
git commit -m "feat: add advanced outline import wizard"
```

**Smoke test:** Import equivalent TXT and Markdown samples and compare proposed JSON; cancel one and apply/undo the other.

**Result summary:** Confirm format parity, draft restoration, and recoverable import.

**Rollback:** Revert the wizard commit; Simple Workflow remains operational.

## Pass 6: Optional AI mapping suggestions

**Objective:** Let AI propose passage assignments without changing text or bypassing review.

**Acceptance criteria:** AI receives passage IDs/text only, returns validated assignments only, preserves all text, labels provenance, and fails back to manual mapping.

**Files:**
- Modify: `src/shared/writer/types.ts`
- Modify: `src/shared/writer/schemas.ts`
- Modify: `supabase/functions/_shared/writerSchemas.ts`
- Modify: `supabase/functions/writer-tools/index.ts`
- Modify: `src/portals/writer/WriterOutlinePasteReview.tsx`
- Modify: `src/portals/writer/WriterOutlineImportWizard.tsx`
- Modify: `src/portals/writer/WriterPortal.tsx`
- Modify: `src/shared/writer/__tests__/schemas.test.ts`

- [ ] **Step 1: Write failing shared-schema tests.**

```ts
const request = writerToolsRequestSchema.parse({
  mode: 'outline_classification_preview',
  passages: [{ id: 'p-1', text: 'The return to the campfire.' }],
});
expect(request.mode).toBe('outline_classification_preview');
```

- [ ] **Step 2: Add matching client/Edge schemas** with a maximum of 250 passages and 60,000 total input characters. Response entries contain only `id`, `assignment`, optional `act_name`, optional `page_target`, and `reason` capped at 240 characters.

- [ ] **Step 3: Implement preview-only Edge behavior.** Validate that returned IDs exist, reject duplicate IDs, ignore no text, write no database rows, and return `mode: 'outline_classification_preview'`.

```ts
return Response.json({
  success: true,
  mode: 'outline_classification_preview',
  data: classificationParsed.data,
}, { headers: corsHeaders });
```

- [ ] **Step 4: Merge suggestions by passage ID** while retaining original `text`, `startLine`, and `endLine`; set `provenance: 'ai'`; leave missing/invalid suggestions Unassigned.

```ts
export function mergeOutlineClassificationSuggestions(
  diagnostic: OutlinePasteDiagnostic,
  suggestions: OutlineClassificationSuggestion[],
): OutlinePasteDiagnostic {
  const byId = new Map(suggestions.map((suggestion) => [suggestion.id, suggestion]));
  return rebuildOutlineDiagnostic(diagnostic, diagnostic.passages.map((passage) => {
    const suggestion = byId.get(passage.id);
    return suggestion ? { ...passage, ...suggestion, text: passage.text, provenance: 'ai' as const } : passage;
  }));
}
```

- [ ] **Step 5: Add Suggest and Classify-with-review behavior** to Simple and Advanced surfaces. AI errors show an alert and leave manual controls enabled.

- [ ] **Step 6: Run shared schema, review, and wizard tests.**

- [ ] **Step 7: Deploy `writer-tools` to the linked Supabase project and run an authenticated preview smoke** only after verifying project identity and auth.

- [ ] **Step 8: Commit the pass.**

```bash
git add src/shared/writer/types.ts src/shared/writer/schemas.ts supabase/functions/_shared/writerSchemas.ts supabase/functions/writer-tools/index.ts src/portals/writer/WriterOutlinePasteReview.tsx src/portals/writer/WriterOutlineImportWizard.tsx src/portals/writer/WriterPortal.tsx src/shared/writer/__tests__/schemas.test.ts
git commit -m "feat: add optional AI outline mapping preview"
```

**Smoke test:** AI off/manual assignment, AI suggestion success, malformed suggestion rejection, and simulated AI failure.

**Result summary:** Confirm zero DB writes during classification and visible AI provenance.

**Rollback:** Revert client/schema commit and redeploy the prior Edge Function if already published; manual mapping remains the fallback.

## Audit 2: Passes 4–6 midpoint QA

- [ ] Compare implementation against every Simple Workflow and Advanced Tools acceptance criterion in the approved spec.
- [ ] Verify local/global preferences stay synchronized across reload.
- [ ] Verify no right-click-only action exists; contextual menus are intentionally omitted because visible assignment controls are clearer and accessible.
- [ ] Test AI-off, unauthenticated, expired-session, AI-error, source-locked, save-error, and narrow-screen states.
- [ ] Run the full Writer suite and resolve failures before Pass 7.

Run: `npm run test -- --run src/portals/writer/__tests__ src/shared/writer/__tests__/schemas.test.ts`

## Pass 7: Editable AI Treatment preview and explicit promotion

**Objective:** Stop `outline_issue` from becoming official before the user reviews the generated proposal.

**Acceptance criteria:** Existing outline remains official during generation/review; proposal is editable; Make official inserts a new version; alternate/cancel/regenerate work; failed promotion preserves proposal.

**Files:**
- Create: `src/portals/writer/WriterOutlineTreatmentReview.tsx`
- Create: `src/portals/writer/writerOutlineDiff.ts`
- Create: `src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx`
- Create: `src/portals/writer/__tests__/writerOutlineDiff.test.ts`
- Modify: `src/shared/writer/types.ts`
- Modify: `src/shared/writer/schemas.ts`
- Modify: `supabase/functions/_shared/writerSchemas.ts`
- Modify: `supabase/functions/writer-tools/index.ts`
- Modify: `src/portals/writer/WriterPortal.tsx`

- [ ] **Step 1: Write failing diff/component/schema tests** for added/removed/changed/reordered content, editing, promotion, alternate retention, regenerate, cancel, and save failure.

```tsx
render(<WriterOutlineTreatmentReview current={current} proposed={proposed} onProposedChange={onChange} onMakeOfficial={onMakeOfficial} onKeepAlternate={onAlternate} onRegenerate={onRegenerate} onCancel={onCancel} />);
expect(screen.getByText(/2 additions/i)).toBeVisible();
await user.click(screen.getByRole('button', { name: /make official/i }));
expect(onMakeOfficial).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Extend `outline_issue` with `save: false`** in both schemas. Preserve `save: true` as the temporary backward-compatible default until WriterPortal switches in this pass.

- [ ] **Step 3: Change Edge behavior:** when `save === false`, validate and return `data` without querying version or inserting; when true/omitted, retain current behavior.

```ts
if (save === false) {
  return Response.json(
    { success: true, mode: 'outline_issue', data: outlineParsed.data },
    { headers: corsHeaders },
  );
}
```

- [ ] **Step 4: Implement the treatment review props.**

```ts
type WriterOutlineTreatmentReviewProps = {
  current: Record<string, unknown> | null;
  proposed: Record<string, unknown>;
  busy?: boolean;
  error?: string | null;
  onProposedChange(next: Record<string, unknown>): void;
  onMakeOfficial(): void;
  onKeepAlternate(): void;
  onRegenerate(): void;
  onCancel(): void;
};
```

- [ ] **Step 5: Update `runOutlineGenerate`** to request `save: false`, open review, and leave `outlines` unchanged. Make official uses `createWriterOutlineVersion`, snapshots the previous outline, syncs approved source, refreshes rows, and offers Undo.

- [ ] **Step 6: Store alternate proposals in issue notes** under a bounded `outline_alternates` array containing timestamp, treatment mode, and proposal; cap at 10 entries.

- [ ] **Step 7: Run focused tests and authenticated Supabase preview/promotion smoke.**

- [ ] **Step 8: Commit the pass.**

```bash
git add src/portals/writer/WriterOutlineTreatmentReview.tsx src/portals/writer/writerOutlineDiff.ts src/portals/writer/WriterPortal.tsx src/shared/writer/types.ts src/shared/writer/schemas.ts supabase/functions/_shared/writerSchemas.ts supabase/functions/writer-tools/index.ts src/portals/writer/__tests__/WriterOutlineTreatmentReview.test.tsx src/portals/writer/__tests__/writerOutlineDiff.test.ts
git commit -m "feat: require review before AI outline promotion"
```

**Smoke test:** Generate, compare, edit, cancel, regenerate, keep alternate, promote, undo, and reload.

**Result summary:** Record official version before generation, during review, after promotion, and after undo.

**Rollback:** Revert client and Edge changes together; restore the prior deployed Edge Function version if necessary.

## Pass 8: Guidance, polish, and accessibility completion

**Objective:** Complete discoverability, dismissible onboarding, responsive behavior, and all states.

**Acceptance criteria:** Every non-obvious control has hover/focus help; first-use guidance can be dismissed and restored; essential instructions remain visible; keyboard/screen-reader/mobile flows pass.

**Files:**
- Modify: `src/portals/writer/WriterOutlinePasteReview.tsx`
- Modify: `src/portals/writer/WriterOutlineImportWizard.tsx`
- Modify: `src/portals/writer/WriterOutlineTreatmentReview.tsx`
- Modify: `src/portals/writer/WriterOutlinePasteSettings.tsx`
- Modify: `src/portals/writer/writerHelpRegistry.tsx`
- Modify: `src/portals/writer/__tests__/writerOverlaysAccessibility.test.tsx`

- [ ] **Step 1: Write failing tests** for tooltip focus, dismiss/restore, live announcements, focus return, Escape confirmation, non-color provenance, and 390px layout classes.

```tsx
await user.tab();
expect(await screen.findByRole('tooltip', { name: /unassigned text is preserved/i })).toBeVisible();
await user.click(screen.getByRole('checkbox', { name: /don't show these tips again/i }));
expect(onPreferencesChange).toHaveBeenCalledWith(expect.objectContaining({ showFirstUseGuidance: false }));
```

- [ ] **Step 2: Implement concise Tooltip wrappers** around non-obvious actions and contextual first-use callouts with **Don't show these tips again**. Persist dismissal through the shared preference model.

- [ ] **Step 3: Add complete idle/analyzing/review/loading/AI-unavailable/validation/applying/success/save-error/empty/lock states.** Use visible labels and `role="status"`/`role="alert"` appropriately.

- [ ] **Step 4: Run accessibility/component tests and browser keyboard/mobile QA.**

- [ ] **Step 5: Run the repository UI critic required for frontend changes and resolve all high/medium findings.**

- [ ] **Step 6: Commit the pass.**

```bash
git add src/portals/writer/WriterOutlinePasteReview.tsx src/portals/writer/WriterOutlineImportWizard.tsx src/portals/writer/WriterOutlineTreatmentReview.tsx src/portals/writer/WriterOutlinePasteSettings.tsx src/portals/writer/writerHelpRegistry.tsx src/portals/writer/__tests__/writerOverlaysAccessibility.test.tsx
git commit -m "feat: complete outline review guidance and accessibility"
```

**Smoke test:** Keyboard-only Simple/Advanced/AI review at desktop and mobile widths, including tips dismissal and restoration.

**Result summary:** Record focus order, announcements, viewport sizes, and UI critic disposition.

**Rollback:** Revert polish commit only if it blocks release; do not remove essential visible guidance or accessibility labels.

## Pass 9: Regression, documentation, deployment, and final audits

**Objective:** Prove the complete workflow, document it, and publish only after all gates pass.

**Acceptance criteria:** Focused/full tests, lint, build, browser QA, Edge/live smoke, audits, walkthrough, commit, push, and Cloudflare deployment all pass or are explicitly blocked without false completion claims.

**Files:**
- Modify: `walkthrough.md`
- Modify: `docs/superpowers/plans/2026-07-22-writer-outline-paste-review-implementation.md`
- Modify: nearest owning `AGENTS.md` only if the DOX pass finds a durable contract/ownership/workflow change.

- [ ] **Step 1: Run focused regression.**

Run: `npm run test -- --run src/portals/writer/__tests__ src/shared/writer/__tests__/schemas.test.ts`

Expected: all Writer and shared Writer schema tests pass.

- [ ] **Step 2: Run full project gates.**

Run: `npm run test`

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

Expected: all pass; document existing nonblocking warnings precisely.

- [ ] **Step 3: Run signed-in browser regression** with uniquely named disposable content: Simple ambiguous paste/manual mapping/undo; preferences reload; Advanced TXT/MD import/draft/cancel/apply/undo; AI mapping success/failure; AI treatment edit/cancel/alternate/promote/undo; mobile/keyboard/tooltips. Confirm cleanup.

- [ ] **Step 4: Perform final ReAct audit.** Verify each action has observable feedback, errors preserve recoverable state, retry paths use current state, and no hidden mutation occurs between reasoning/action/observation cycles.

- [ ] **Step 5: Perform final QA audit.** Trace every acceptance criterion to automated or manual evidence; confirm parser text accounting and zero preview DB writes.

- [ ] **Step 6: Perform final UI/UX audit.** Check visual hierarchy against Writers' Workshop, local discoverability, terminology, responsive layout, accessibility, tooltip/callout behavior, and absence of right-click-only requirements.

- [ ] **Step 7: Complete the DOX pass.** Re-read the root-to-file AGENTS chain, update only affected durable contracts/indexes, and record why unchanged docs remained unchanged.

- [ ] **Step 8: Append the immediate walkthrough section** with real files, commands, counts, browser evidence, Edge version, Cloudflare version, risks, and cleanup status.

- [ ] **Step 9: Commit final documentation.**

```bash
git add walkthrough.md docs/superpowers/plans/2026-07-22-writer-outline-paste-review-implementation.md
git commit -m "docs: record outline paste review delivery"
```

- [ ] **Step 10: Push only after the tree and commit scope are confirmed.**

Run: `git status --short`

Run: `git push`

- [ ] **Step 11: Deploy Supabase Edge Function if its committed source differs from production, then deploy Cloudflare.**

Run: `supabase functions deploy writer-tools`

Run: `npm run deploy:cloudflare`

- [ ] **Step 12: Verify live production.** Confirm the deployed Cloudflare version/URL, load the live Writer portal, check console/network errors, and repeat a safe non-destructive paste-review smoke. Confirm Edge preview modes return success and do not persist until promotion.

**Smoke test:** Full signed-in live happy path plus cancellation and rollback.

**Result summary:** Record exact test counts, audit outcomes, commit SHA, pushed branch, Supabase function version/status, Cloudflare deployment version, live URL, and any blocked checks.

**Rollback:** Use Cloudflare version rollback for client regression and redeploy the last known-good `writer-tools` function for Edge regression. Because official outline updates create versions, restore the preceding outline rather than deleting history.

## Final completion gate

The work is complete only when:

- all nine passes and both intermediate audits are checked off;
- every scoped smoke passes before the next pass begins;
- full regression, lint, build, ReAct, QA, and UI/UX audits pass;
- signed-in recovery paths are exercised and disposable QA records are cleaned up;
- DOX and walkthrough updates are verified;
- commits are pushed;
- Supabase and Cloudflare deployments are confirmed live when applicable;
- any access-blocked live check is prominently reported as blocked rather than passed.
