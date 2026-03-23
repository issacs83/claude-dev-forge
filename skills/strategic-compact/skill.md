---
name: strategic-compact
description: "Context-aware compact timing at logical boundaries"
---

# Strategic Compact Skill

## Trigger
- Tool call count exceeds ~50
- Logical phase transition (Research → Plan, Plan → Implement)
- User requests session reorganization

## Before Compacting (Mandatory)
1. Save key decisions to MEMORY.md or project memory
2. Save current progress and next steps to TODO or handoff
3. Note any open debugging context or error traces
4. Save large build/test outputs to files (not in context)

## When to Compact
- After completing a research phase
- After plan approval, before implementation starts
- After a major milestone (feature complete, tests passing)
- When repeated tool calls are accumulating stale context

## When NOT to Compact
- Mid-implementation of a multi-file change
- While actively debugging an issue
- When context contains critical error traces not yet saved
- During a review cycle (context needed for coherent feedback)

## Embedded-Specific
- Yocto build logs: save to file before compact (`bitbake` output is huge)
- Device tree analysis: save findings to MEMORY.md before compact
- Kernel config exploration: document relevant CONFIG_ options before compact
