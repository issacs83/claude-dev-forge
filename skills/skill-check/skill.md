---
name: skill-check
description: "Mandatory skill gate: check available skills before any action (1% rule)"
---

# Skill Check (Mandatory Gate)

## The Rule

**Check for relevant skills BEFORE any response or action.**
Even a 1% chance a skill might apply = invoke it to check.
If the invoked skill doesn't fit, discard and proceed normally.

## Flow

```
User message received
  → Could any skill apply? (even 1%)
    → YES: Invoke Skill tool → Follow skill → Respond
    → DEFINITELY NOT: Respond directly
```

## Subagent Exception

Subagents dispatched for a specific task skip this check.
Only the main conversation thread enforces the gate.

## Priority Order

When multiple skills could apply:

1. **Process skills first** (debugging, planning) — determines HOW to approach
2. **Implementation skills second** (build, tdd, flash) — guides execution

Examples:
- "Fix this bug" → `systematic-debugging` first, then domain skill
- "Build X" → `plan` first, then implementation skill
- "Deploy to board" → `flash` directly

## Red Flags — STOP, You're Skipping

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE context gathering. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "I know what that means" | Knowing the concept =/= using the skill. Invoke it. |

## Instruction Priority

1. **User's explicit instructions** (CLAUDE.md, project rules, direct requests) — highest
2. **Forge skills** — override system defaults where they conflict
3. **System prompt defaults** — lowest

User instructions always win. "Don't use TDD" overrides the `tdd` skill.

## Skill Types

- **Rigid** (tdd, systematic-debugging, verify-loop): Follow exactly. No shortcuts.
- **Flexible** (plan, explore, build): Adapt principles to context.
