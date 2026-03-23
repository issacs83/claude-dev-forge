---
name: rules-distill
description: "Auto-detect repeated patterns and propose new rules"
---

# Rules Distill Skill

## Trigger
- `/learn` command with pattern detection
- Same correction applied 3+ times in a session
- User explicitly says "이거 룰로 만들어줘", "add this as a rule"

## Workflow
1. **Detect**: identify the repeated pattern or correction
2. **Check duplicates**: search existing rules/*.md for similar content
3. **Draft rule**: write concise rule in existing format
4. **Propose location**: suggest which rules file to add to (or create new)
5. **User approval**: NEVER auto-add — always show draft and ask for confirmation

## Rule Format
- Follow existing `rules/*.md` structure
- One clear statement per bullet
- Include "why" when not obvious
- Keep rules actionable, not aspirational

## Safety
- Never auto-modify rules files
- Always show the exact diff before applying
- If unsure whether it's a project-specific convention or general rule, ask
- Project-specific → CLAUDE.md; general → rules/*.md
