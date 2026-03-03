---
allowed-tools: ""
description: "Fast commit for small changes (<3 files)"
---

# /quick-commit — Quick Commit

You are executing the `/quick-commit` command.

## Steps

1. Run `git status` and `git diff` to see changes
2. If >3 files changed, suggest using `/commit-push-pr` instead
3. Stage the changed files
4. Generate conventional commit message
5. Commit with `Co-Authored-By: Claude <noreply@anthropic.com>`
6. Push to current branch

## Rules
- Skip PR creation (for small, low-risk changes)
- Use conventional commit prefixes (feat:, fix:, docs:, etc.)
- Never commit secrets or build artifacts

## Arguments
- `$ARGUMENTS` — Optional commit message. If empty, auto-generate from diff.
