---
allowed-tools: ""
description: "Code cleanup: dead code, unused imports, naming consistency"
---

# /refactor-clean — Code Cleanup

You are executing the `/refactor-clean` command.

## Steps

1. **Analyze**
   - Scan for unused imports/variables
   - Find dead code (unreachable, unused functions)
   - Check naming consistency
   - Identify code duplication

2. **Clean**
   - Remove unused imports
   - Remove dead code
   - Fix naming inconsistencies
   - Extract duplicated code (if >3 occurrences)

3. **Verify**
   - Run build to ensure nothing broke
   - Run tests to verify behavior unchanged
   - Show diff of all changes for user review

## Rules
- Behavior-preserving changes ONLY
- Run tests after every change
- Don't clean code that wasn't in scope

## Arguments
- `$ARGUMENTS` — Scope: file path, directory, or "all" for project-wide.
