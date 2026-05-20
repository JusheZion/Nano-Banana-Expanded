# Enhanced QA Mandate

**CRITICAL**: This QA process **MUST** be applied to EVERY code change, without exception.

## Process Flow

```
Pre-Edit → Make Edit → Post-Edit Verification → QA Checks → Test → Report
```

## Pre-Edit Phase

### View Target Code
```markdown
1. Use view_file on target file
2. Identify exact line ranges
3. Copy TargetContent exactly as shown
4. Verify no typos in TargetContent
```

## Post-Edit Phase (MANDATORY)

### Immediate Mechanical Verification

After EVERY edit, perform these checks:

#### 1. View Edited Section
```markdown
✓ view_file the edited region + 10 lines context
✓ Scan for accidental deletions
✓ Verify all function declarations present
✓ Check for orphaned code blocks
✓ Confirm braces/brackets balanced
```

#### 2. Check Structure Integrity
```markdown
✓ All imports intact
✓ All exports intact  
✓ All function signatures complete
✓ No missing semicolons/commas
✓ Proper indentation maintained
```

## QA Analysis (After Mechanical Verification)

### 1. Syntactic & Static Analysis
- ✅ **Syntax**: Valid TypeScript/JavaScript
- ✅ **Type Correctness**: All types properly defined
- ✅ **Imports**: All required imports present
- ✅ **Exports**: All exports correct
- ✅ **No Compilation Errors**: Code compiles without errors

### 2. Lint & Type Errors Check (NEW)
```markdown
Review ALL lint errors (not just related to edit):
✓ TypeScript errors (Cannot find name, Type X not assignable, etc.)
✓ Unused variables/imports
✓ Missing return statements
✓ Incorrect type annotations
✓ Property access errors

Action Required:
- List each error with ID
- Fix before proceeding
- Re-verify after fixes
```

### 3. Contextual Logic Review
- ✅ **Integration**: Change fits with surrounding code
- ✅ **Dependencies**: All dependencies handled
- ✅ **Edge Cases**: Common pitfalls addressed
- ✅ **State Management**: Proper state updates
- ✅ **Event Handling**: Correct event propagation

### 4. Semantic Correctness
- ✅ **Algorithm**: Logic implements requirement correctly
- ✅ **Data Flow**: Data transformations accurate
- ✅ **Side Effects**: Intentional and documented
- ✅ **Performance**: No obvious inefficiencies

### 5. Security Scan
- ✅ **Input Validation**: External inputs validated
- ✅ **XSS Prevention**: No innerHTML with user data
- ✅ **SQL Injection**: Parameterized queries only
- ✅ **Authentication**: Proper auth checks

## Error Reporting

### If Mechanical Errors Found
```markdown
❌ MECHANICAL ERROR DETECTED

Location: [file:line]
Issue: [description]
Type: [deletion/malformed/orphaned/etc.]

ACTION: Immediate revert or fix required
DO NOT PROCEED with testing until fixed
```

### If Lint/Type Errors Found
```markdown
❌ LINT ERRORS DETECTED

Errors (sorted by severity):
1. [Error ID] - [File:Line] - [Description]
2. [Error ID] - [File:Line] - [Description]

ACTION: Fix each error systematically
Mark as fixed: [Error IDs]
```

### If Logic Errors Found
```markdown
❌ LOGIC ERROR DETECTED

Issue: [description]
Impact: [affected functionality]
Suggested Fix: [specific recommendation]

ACTION: Revise implementation
```

### If All Checks Pass
```markdown
✅ CODE PASSES ALL QA CHECKS

Mechanical: ✓ No deletions, all structures intact
Syntax: ✓ Valid TypeScript, compiles
Linting: ✓ No errors (or list fixed IDs)
Logic: ✓ Correct implementation
Security: ✓ No vulnerabilities
```

## Incremental Testing Protocol

### Test Frequency Decision Tree
```
Is change testable independently?
├─ YES → Test NOW before next edit
└─ NO → Group with related changes (max 3)

After 3 edits OR critical function change
└─ MANDATORY browser/unit test

Before marking task complete
└─ COMPREHENSIVE test of all changes
```

### Testing Checklist
- [ ] Unit test (if applicable)
- [ ] Integration test (if function changed)
- [ ] Browser test (if UI affected)
- [ ] Edge cases tested
- [ ] Error states verified

## Compliance

**This QA Mandate is NON-NEGOTIABLE.**

Every code change receives:
1. Pre-edit verification ✓
2. Post-edit mechanical check ✓
3. Full QA analysis ✓
4. Incremental testing ✓
5. Final report ✓

**Failure to follow this process violates the quality standard.**
