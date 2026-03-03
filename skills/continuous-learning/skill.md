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

## Storage Strategy
- `MEMORY.md`: concise index (max 200 lines)
- Topic files: detailed notes (e.g., `debugging.md`, `patterns.md`)
- Update existing entries rather than creating new ones
