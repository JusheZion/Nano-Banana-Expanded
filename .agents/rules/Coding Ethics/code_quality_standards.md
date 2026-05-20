Code Quality Standards

Please read the documents below FIRST:

1. QA Mandate (qa_mandate_enhanced.md) 
2. Pre-Commit Checklist (pre_commit_checklist.md) 
3. Verify Edit Workflow (verify_edit_workflow.md) 
4. Testing Protocol (testing_protocol.md) 
 
Before writing ANY code, the AI assistant must:
1. Read and acknowledge all four protocol documents
2. Confirm understanding of incremental testing requirements
3. Commit to the workflow: Pre-edit view → Make edit → Post-edit verify → Test 
__________________________________________________________________


DEVELOPMENT WORKFLOW FOR AI ASSISTANT

Universal Rule: The Edit-Verify-Test Cycle
EVERY single code change follows this pattern:


1. PRE-EDIT:
   → View target file with context (view_file)
   → Identify exact line ranges
   → Copy TargetContent character-for-character
   → Plan the smallest possible change

2. EXECUTE EDIT:
   → Use replace_file_content or multi_replace_file_content
   → Include clear description

3. POST-EDIT VERIFICATION:
   → View edited section + 10 lines context
   → Check for accidental deletions
   → Verify function declarations intact
   → Check imports/exports present
   → Confirm braces/brackets balanced

4. QA ANALYSIS:
   → Review ALL lint errors (not just new ones)
   → Fix TypeScript errors immediately
   → Verify logic correctness
   → Check security (input validation, XSS prevention)

5. INCREMENTAL TESTING:
   → If change is testable independently → Test NOW
   → If part of larger feature → Group max 3 changes
   → After 3 edits OR critical function → MANDATORY test
   → Browser test for UI changes
   → Unit test for logic functions

6. REPORT STATUS:
   → ✅ All checks pass → Proceed
   → ❌ Any check fails → STOP, fix, restart cycle

__________________________________________________________________

Testing Frequency Matrix

Change Type	Test Timing	Test Type
Type definition	After 1 edit	Lint check only
Helper function	After function complete	Unit test
Component logic	After logic change	Browser test
Event handler	After handler added	Browser interaction test
State change	After state update	Verify state in browser
UI element	Immediately	Visual verification
Database query	After implementation	Database test

Maximum Batch Sizes Before Testing

* Type changes only: Up to 5 files before lint check
* Logic changes: 3 functions max before test
* UI changes: 1 component at a time
* Critical functions: Test immediately, no batching


MANDATORY CHECKPOINTS
After Every 5 Edits: Comprehensive Review

STOP and perform:
1. Full application browser test
2. Test all previously working features (regression test)
3. Check console for any new warnings
4. Verify TypeScript compiles (npm run type-check)
5. Review all open lint errors
6. Document any technical debt

Only proceed if ALL checks pass
End of Each Phase: Integration Test


1. Test all features in that phase together
2. Test interactions between features
3. Test on different screen sizes (if UI phase)
4. Check browser console thoroughly
5. Verify no memory leaks (DevTools Performance tab)
6. Document completion status

AI ASSISTANT SPECIFIC GUIDELINES
Communication Protocol
Before Each Change:


I will:
1. State which file I'm editing
2. Describe the change in 1-2 sentences
3. Confirm I've viewed the target code
4. List the exact line ranges
After Each Change:


I will:
1. Report: "✅ CODE PASSES ALL QA CHECKS" or "❌ ERROR DETECTED"
2. List any lint errors found (with IDs)
3. Describe test performed
4. Confirm test result (pass/fail)


Error Response Protocol
If Mechanical Error Detected:


❌ MECHANICAL ERROR DETECTED

Location: src/components/Canvas.tsx:145
Issue: Accidental deletion of handleDragEnd function
Type: Deletion

ACTION: Reverting edit and re-attempting with smaller scope
DO NOT PROCEED with testing until fixed
If Lint/Type Error Detected:


❌ LINT ERRORS DETECTED

Errors (sorted by severity):
1. TS2304 - Canvas.tsx:78 - Cannot find name 'Pnael' (typo)
2. TS2322 - panelStore.ts:23 - Type 'string' not assignable to 'number'

ACTION: Fixing each error systematically
Will report when fixed
Testing Documentation Template
For every browser test, report in this format:


🧪 BROWSER TEST PERFORMED

Feature Tested: Character Library - Add Character Button
Steps:
1. Hard refresh (Cmd+Shift+R)
2. Navigate to Character Library page
3. Click "Add Character" button
4. Verify modal opens
5. Check console for errors

Results:
- [ ] ✅ Modal opens correctly
- [ ] ✅ No console errors
- [ ] ✅ Close button works
- [ ] ✅ No visual glitches

Status: ✅ PASSED


ANTI-PATTERNS TO AVOID

❌ NEVER DO:

1. Batch Edits Without Testing
    * Making 10 changes then testing → Recipe for disaster
    * Correct: Edit → Test → Edit → Test
2. Large Replacements Without Viewing
    * Replacing 50+ lines without viewing context
    * Correct: View first, understand context, make small changes
3. Ignore Lint Errors
    * "I'll fix those later"
    * Correct: Address immediately before proceeding
4. Skip Post-Edit Verification
    * Assuming edit worked correctly
    * Correct: Always view edited section to confirm
5. Assume TargetContent
    * Guessing what code to replace
    * Correct: Copy exact text from view_file output
6. Test Once at End
    * Building entire feature before first test
    * Correct: Test incrementally after each logical unit


✅ ALWAYS DO:
1. View Before Editing
    * See exact code context
    * Verify line ranges correct
2. Smallest Possible Changes
    * Break large tasks into tiny steps
    * 1-20 lines per edit maximum
3. Verify After Every Edit
    * View edited section
    * Check for deletions/errors
4. Test Incrementally
    * Test after each testable change
    * Maximum 3 edits before browser test
5. Fix Errors Immediately
    * STOP when error detected
    * Don't proceed until resolved
6. Document Everything
    * Log each change
    * Record test results




