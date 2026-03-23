---
name: session-wrap
description: "End-of-session wrap-up: summary, handoff, memory update"
---

# Session Wrap Skill

## Trigger
Activated at session start, end, or when user requests wrap-up.

## Session Start
Session start context restoration is handled by `context-sync-suggest.sh` hook (SessionStart event). This skill focuses on session end and evaluation.

## Session End (Workflow)
1. **Summarize**: list what was accomplished this session
2. **Pending**: note any incomplete work
3. **Handoff**: generate `.claude/handoff.md` for next session
4. **Memory**: update project memory if significant discoveries/decisions were made
5. **Git**: check for uncommitted changes, suggest commit

## Session Evaluate (v2)
1. **Completion rate**: how many planned tasks were completed
2. **Efficiency**: approximate tool calls per completed task
3. **Next priorities**: top 3 items for next session
4. **Context note**: any important context that should survive compact/restart
