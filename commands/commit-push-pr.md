---
allowed-tools: ""
description: "Full git flow: commit → push → PR creation"
---

# /commit-push-pr — Commit, Push, and Create PR

You are executing the `/commit-push-pr` command.

## Steps

1. **Pre-flight Check**
   - Run `git status` to see all changes
   - Run `git diff --staged` to verify staged changes
   - Verify build passes and tests pass

2. **Stage Changes**
   - Stage relevant files (prefer specific files over `git add .`)
   - Never stage .env, credentials, or build artifacts

3. **Commit**
   - Generate conventional commit message: `<type>: <description>`
   - Types: feat, fix, refactor, docs, test, ci, chore, perf
   - Include `Co-Authored-By: Claude <noreply@anthropic.com>`

4. **Push**
   - Push to remote branch
   - If no upstream, set it: `git push -u origin <branch>`

5. **Create PR**
   - Use `gh pr create` with title and body
   - Body format:
     ```
     ## Summary
     - [bullet points]

     ## Test Plan
     - [ ] [verification steps]
     ```

## Merge Gate (all must pass before merge)
- Build succeeds
- Tests pass
- Lint passes
- No CRITICAL security findings

## Arguments
- `$ARGUMENTS` — Optional commit message or PR title override.
