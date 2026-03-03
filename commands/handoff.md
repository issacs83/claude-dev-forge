---
allowed-tools: ""
description: "Generate context handoff document for session continuity"
---

# /handoff — Session Handoff

You are executing the `/handoff` command.

## Steps

1. **Gather Session Context**
   - List files modified in this session
   - Summarize what was accomplished
   - Note any pending work or blockers

2. **Generate Handoff Document**
   Write to `.claude/handoff.md`:
   ```markdown
   # Session Handoff — [date]

   ## Completed
   - [list of completed tasks]

   ## In Progress
   - [current task status]

   ## Blockers
   - [any blockers or issues]

   ## Next Steps
   - [what to do next]

   ## Modified Files
   - [list of changed files]

   ## Notes
   - [important context for next session]
   ```

3. **Update Memory**
   - If significant decisions were made, suggest updating `.claude/memory/MEMORY.md`

## Arguments
- `$ARGUMENTS` — Optional additional notes to include.
