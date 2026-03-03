---
name: session-wrap
description: "End-of-session wrap-up: summary, handoff, memory update"
---

# Session Wrap Skill

## Trigger
Activated at session end or when user requests wrap-up.

## Workflow
1. **Summarize**: list what was accomplished this session
2. **Pending**: note any incomplete work
3. **Handoff**: generate `.claude/handoff.md` for next session
4. **Memory**: update project memory if significant discoveries/decisions were made
5. **Git**: check for uncommitted changes, suggest commit
