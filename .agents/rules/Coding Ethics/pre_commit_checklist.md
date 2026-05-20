# Pre-Commit Checklist

This checklist **MUST** be followed before ANY code edit is made and after EVERY edit is completed.

## Before Making Any Edit

### 1. Understand the Change
- [ ] Read the requirement carefully
- [ ] Identify the exact file(s) and line ranges to modify
- [ ] Understand the surrounding code context

### 2. Pre-Edit Verification
- [ ] Use `view_file` to see EXACT lines being replaced (with 5-10 lines context)
- [ ] Verify `StartLine` and `EndLine` ranges are correct
- [ ] Copy `TargetContent` directly from the viewed content
- [ ] Double-check `TargetContent` matches character-for-character (including whitespace)
- [ ] For `multi_replace_file_content`, verify EACH chunk independently

### 3. Scope Check
- [ ] Is this the smallest possible change to achieve the goal?
- [ ] Can I split this into multiple smaller edits? (If yes, DO IT)
- [ ] Will this change affect other functions/imports?

## After Making Each Edit

### 4. Immediate Verification
- [ ] Use `view_file` to check edited section + 10 lines before/after
- [ ] Verify NO accidental deletions occurred
- [ ] Verify all function declarations intact
- [ ] Verify all imports still present
- [ ] Check closing braces/brackets match

### 5. Lint & Type Check
- [ ] Review ALL TypeScript/ESLint errors (not just new ones)
- [ ] Check for unused variable warnings
- [ ] Verify no missing return statements
- [ ] Confirm proper type annotations

### 6. Incremental Testing
- [ ] If change is testable, test NOW before next edit
- [ ] If browser test needed, test THIS change before making more
- [ ] Do NOT batch 5+ edits before testing

## Critical Rules

### ❌ NEVER:
- Make large replacements (>30 lines) without viewing first
- Use `multi_replace_file_content` for closely-spaced chunks
- Assume `TargetContent` - always verify by viewing
- Skip post-edit verification
- Batch test 5+ changes at once

### ✅ ALWAYS:
- View before editing
- Verify after editing
- Edit in small increments
- Test frequently
- Read ALL lint errors

## Quality Gates

**Only proceed to next edit if:**
1. ✅ No TypeScript errors
2. ✅ No unexpected deletions
3. ✅ All functions/imports intact
4. ✅ Code compiles successfully

**If any check fails:**
→ STOP immediately
→ Review the error
→ Fix the error before proceeding
→ Restart checklist for the fix
