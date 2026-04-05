---
name: systematic-debugging
description: "Use when encountering any bug, test failure, or unexpected behavior — before proposing fixes"
---

# Systematic Debugging

## Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If Phase 1 is not complete, no fixes are permitted.

## When to Use

ANY technical issue: test failures, bugs, unexpected behavior, performance problems, build failures, integration issues.

**Especially when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- You don't fully understand the issue

## The Four Phases

Complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip errors or warnings — they often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably? Exact steps?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - Git diff, recent commits, new dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**
   For EACH component boundary:
   - Log what data enters/exits the component
   - Verify environment/config propagation
   - Run once to gather evidence showing WHERE it breaks
   - THEN investigate that specific component

5. **Trace Data Flow (Root Cause Tracing)**
   When error is deep in call stack:
   - Where does the bad value originate?
   - What called this with the bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

   **NEVER fix just where the error appears.** Trace back to find the original trigger.

### Phase 2: Pattern Analysis

1. **Find Working Examples** — locate similar working code in the same codebase
2. **Compare Against References** — read reference implementation COMPLETELY, don't skim
3. **Identify Differences** — list every difference, however small
4. **Understand Dependencies** — what components, settings, config, environment does this need?

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis** — "I think X is the root cause because Y" — be specific
2. **Test Minimally** — smallest possible change, one variable at a time
3. **Verify** — worked? → Phase 4. Didn't work? → new hypothesis, DON'T stack fixes
4. **When You Don't Know** — say "I don't understand X", ask for help, research more

### Phase 4: Implementation

1. **Create Failing Test Case** — simplest reproduction, automated if possible
2. **Implement Single Fix** — ONE change, no "while I'm here" improvements
3. **Verify Fix** — test passes? no regressions? issue resolved?
4. **If Fix Doesn't Work:**
   - < 3 attempts: return to Phase 1, re-analyze
   - >= 3 attempts: **STOP — question the architecture** (see below)

5. **If 3+ Fixes Failed: Question Architecture**
   Signs of architectural problem:
   - Each fix reveals new shared state/coupling
   - Fixes require "massive refactoring"
   - Each fix creates new symptoms elsewhere

   **Discuss with user before attempting more fixes.**
   This is NOT a failed hypothesis — this is a wrong architecture.

## Defense-in-Depth

After finding root cause, validate at EVERY layer data passes through:

| Layer | Purpose | Example |
|-------|---------|---------|
| Entry point | Reject invalid input at API boundary | Null/empty/type checks |
| Business logic | Ensure data makes sense for operation | Domain-specific validation |
| Environment guard | Prevent dangerous ops in specific contexts | Test-only guards, path checks |
| Debug instrumentation | Capture context for forensics | Stack traces, state logging |

Single validation: "We fixed the bug."
Multiple layers: "We made the bug **impossible**."

## Condition-Based Waiting

Replace arbitrary delays with condition polling:

```
# BAD: sleep 5 && check_result
# GOOD: poll until condition met (with timeout)
```

- Poll every 10ms, always include timeout with clear error
- Call getter inside loop for fresh data (avoid stale cache)
- Document WHY if arbitrary timeout is truly needed

## Red Flags — STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Skip the test, I'll manually verify"
- "I don't fully understand but this might work"
- "One more fix attempt" (when already tried 2+)

**ALL of these mean: STOP. Return to Phase 1.**

## Quick Reference

| Phase | Key Activities | Done When |
|-------|---------------|-----------|
| 1. Root Cause | Read errors, reproduce, check changes, trace data | Understand WHAT and WHY |
| 2. Pattern | Find working examples, compare differences | Identified root difference |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Create test, fix, verify | Bug resolved, tests pass |
