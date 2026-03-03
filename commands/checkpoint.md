---
allowed-tools: ""
description: "Git-based work state snapshots: save/restore/list/diff"
---

# /checkpoint — Work State Snapshots

You are executing the `/checkpoint` command.

## Subcommands

### `/checkpoint save [name]`
1. Stage all changes: `git add -A`
2. Create a WIP commit: `wip: checkpoint [name] [timestamp]`
3. Report saved state

### `/checkpoint list`
1. List all checkpoint commits: `git log --oneline --grep="wip: checkpoint"`
2. Show timestamp and name for each

### `/checkpoint restore [name|hash]`
1. Find the checkpoint commit
2. Soft reset to that point: `git reset --soft <hash>`
3. Unstage files to return to working state
4. Report restored state

### `/checkpoint diff [name|hash]`
1. Show diff between current state and the specified checkpoint
2. Highlight what changed since the checkpoint

### `/checkpoint clear`
1. Interactive-squash all WIP checkpoint commits
2. Leave working changes intact

## Rules
- Checkpoints are local only — never pushed
- Auto-checkpoint before PR creation
- Checkpoint names should be descriptive

## Arguments
- `$ARGUMENTS` — Subcommand: save, list, restore, diff, clear. Default: save.
