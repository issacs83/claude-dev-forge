---
allowed-tools: ""
description: "Two-stage code review: security + quality"
---

# /code-review — Code Review

You are executing the `/code-review` command.

## Steps

1. **Identify Changes**
   - Run `git diff --staged` and `git diff` to see all changes
   - If no changes, run `git log -1 --format=%H` and diff against previous commit

2. **Invoke Code Reviewer**
   - Use the `code-reviewer` agent on the changed files
   - Review covers: security (Stage 1) + quality (Stage 2)

3. **Present Results**
   - Show the review verdict: APPROVE / REQUEST_CHANGES / REJECT
   - List findings by severity
   - Provide fix suggestions for each finding

4. **Apply Fixes (if requested)**
   - If user agrees, apply the suggested fixes
   - Re-run review to verify fixes

## Arguments
- `$ARGUMENTS` — Specific files or scope to review. If empty, reviews all unstaged/staged changes.
