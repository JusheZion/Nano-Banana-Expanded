# Incremental Testing Protocol

## Core Principle

**Test early, test often, test small.**

Instead of: *Make 5 edits → Test once*  
Do: *Make 1 edit → Verify → Test if applicable → Next edit*

## Testing Frequency Matrix

| Change Type | Test Timing | Test Type |
|-------------|-------------|-----------|
| **Type definition** | After 1 edit | Lint check only |
| **Helper function** | After function complete | Unit test |
| **Component logic** | After logic change | Browser test |
| **Event handler** | After handler added | Browser interaction |
| **State change** | After state update | Verify state in browser |
| **UI element** | Immediately | Visual verification |
| **API call** | After implementation | Network test |

## Incremental Strategy

### Small Changes (1-3 lines)
```
1. Make edit
2. Check lint errors
3. If logic change, test
4. Proceed to next
```

### Medium Changes (4-20 lines)
```
1. Make edit
2. View edited section
3. Check ALL lint errors
4. Run relevant test (unit or browser)
5. Verify output/UI
6. Proceed to next
```

### Large Changes (20+ lines)
```
1. STOP - break into smaller changes
2. Make first small piece
3. Test that piece
4. Make next piece
5. Test incrementally
6. Final integration test
```

## Test-Driven Development Flow

### For New Features
```
1. Write/update test (optional but recommended)
2. Make minimal code change
3. Run test
4. ✓ Pass → Next change
5. ✗ Fail → Debug immediately
```

### For Bug Fixes
```
1. Reproduce bug
2. Identify root cause
3. Make minimal fix
4. Test fix immediately
5. Verify bug resolved
6. Test edge cases
```

## Browser Testing Guidelines

### When to Test in Browser
- ✅ After UI component changes
- ✅ After event handler modifications
- ✅ After state management updates
- ✅ Before marking feature complete
- ✅ After any user-facing change

### Browser Test Checklist
```markdown
Basic Functionality:
- [ ] Element renders correctly
- [ ] Click handlers work
- [ ] State updates reflect in UI
- [ ] No console errors
- [ ] No visual glitches

User Interactions:
- [ ] Hover states work
- [ ] Drag and drop (if applicable)
- [ ] Form submissions
- [ ] Navigation flows
- [ ] Error states display

Edge Cases:
- [ ] Empty states
- [ ] Loading states
- [ ] Error states
- [ ] Boundary values
- [ ] Rapid interactions
```

## Test Batching Rules

### Maximum Batch Sizes
- **Type changes only**: Up to 5 files before lint check
- **Logic changes**: 3 functions max before test
- **UI changes**: 1 component at a time
- **Critical functions**: Test immediately, no batching

### Batch Testing Workflow
```
Edit 1 → Edit 2 → Edit 3 → STOP
                            ↓
                    Test all 3 changes
                            ↓
                    ✓ Pass → Continue
                    ✗ Fail → Debug which edit caused issue
                            ↓
                    More edits → Repeat
```

## Regression Testing

### After Each Feature
```markdown
- [ ] Test the new feature works
- [ ] Test related features still work
- [ ] Test unrelated features unaffected
- [ ] Check no new console errors
- [ ] Verify no performance degradation
```

### Before Completion
```markdown
- [ ] Full manual test of all changes
- [ ] Verify all acceptance criteria met
- [ ] Test on different screen sizes (if UI)
- [ ] Test error paths
- [ ] Review console for warnings
```

## Test Failure Response

### When Test Fails
```
1. STOP making new changes
2. Identify which edit caused failure
3. Review that edit carefully
4. Fix the issue
5. Re-test
6. Document what went wrong
7. Update approach if needed
```

### Debugging Priority
```
1. Console errors → Fix first
2. Visual bugs → Fix second  
3. Edge cases → Fix third
4. Performance → Optimize fourth
```

## Example Workflow

### Scenario: Adding connection tool feature

**❌ Wrong Approach:**
```
1. Edit Orb.tsx
2. Edit Canvas.tsx (5 functions)
3. Edit types/index.ts
4. Edit ConnectionLine.tsx
5. Test everything at once
6. Find bugs, not sure which edit caused them
```

**✅ Correct Approach:**
```
1. Update Connection type
   → Check TypeScript errors
   
2. Add handleSegmentStart in Canvas
   → View edited section
   → Check lint errors
   
3. Modify Orb.tsx onClick
   → View changes
   → Browser test: click orb
   → Verify cyan glow appears
   
4. Add connection creation logic
   → View changes  
   → Browser test: drag orb to orb
   → Verify connection created
   
5. Test empty space scenarios
   → Browser test each scenario
   → Verify all workflows
   
6. Final comprehensive test
   → All four workflows
   → Take screenshots
   → Document results
```

## Success Criteria

A test is successful when:
- ✅ Feature works as intended
- ✅ No console errors/warnings
- ✅ No TypeScript errors
- ✅ No visual glitches
- ✅ Edge cases handled
- ✅ Related features unaffected

## Commitment

**I will test incrementally:**
- After logical units of work
- Before adding complexity
- When making risky changes
- Before marking tasks complete

**I will NOT batch test when:**
- Changes affect critical functionality
- Multiple files modified
- User-facing features changed
- Complex logic implemented
