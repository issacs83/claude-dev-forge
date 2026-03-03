---
allowed-tools: ""
description: "Create isolated git worktree for parallel work"
---

# /worktree-start — Isolated Worktree

You are executing the `/worktree-start` command.

## Steps

1. **Create Worktree**
   - Branch name from `$ARGUMENTS` or auto-generate
   - Create in `.claude/worktrees/<branch-name>/`
   - Base on current HEAD

2. **Setup**
   - Ensure .claude/ files don't conflict between worktrees
   - Copy project-level .claude/ to worktree if needed

3. **Report**
   - Show worktree path
   - Show branch name
   - Instructions to switch back

## Cleanup
Run `/worktree-cleanup` when done to remove worktree and branch.

## Arguments
- `$ARGUMENTS` — Branch name for the worktree. If empty, auto-generate from current task.
