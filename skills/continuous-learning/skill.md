---
name: continuous-learning
description: "Pattern learning and knowledge accumulation across sessions"
---

# Continuous Learning Skill

## Trigger
Activated by `/learn` command or when significant patterns are discovered.

## Workflow
1. **Detect**: identify reusable patterns, solutions, or conventions
2. **Classify**: categorize as debugging insight, architecture pattern, or convention
3. **Store**: write to appropriate memory file
4. **Deduplicate**: check for existing entries before writing
5. **Link**: update MEMORY.md index if new topic file created

## Auto-detect Triggers (v2)
- Same file modified 3+ times in a session → likely a convention to capture
- Same error encountered 2+ times → debugging pattern to record
- Same correction applied repeatedly → coding convention to formalize
- User says "always do X" or "never do Y" → rule candidate

## Feedback Loop (v2)
- Track whether stored patterns are actually referenced in later sessions
- Promote frequently-used patterns to rules/*.md (via `rules-distill` skill)
- Archive patterns not referenced in 30+ days

## Storage Strategy
- `MEMORY.md`: concise index (max 200 lines)
- Topic files: detailed notes (e.g., `debugging.md`, `patterns.md`, `conventions.md`)
- Update existing entries rather than creating new ones
- `conventions.md`: project-specific coding conventions detected from corrections
