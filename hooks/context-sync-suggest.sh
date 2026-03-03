#!/usr/bin/env bash
# Hook: SessionStart
# Purpose: Suggest loading project context at session start

# Check for project-level memory
if [[ -f ".claude/memory/MEMORY.md" ]]; then
    echo "📂 Project memory found. Context will be loaded automatically." >&2
fi

# Check for handoff document
if [[ -f ".claude/handoff.md" ]]; then
    echo "📋 Handoff document found from previous session. Consider reviewing it." >&2
fi

exit 0
