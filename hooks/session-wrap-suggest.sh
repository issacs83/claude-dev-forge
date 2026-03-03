#!/usr/bin/env bash
# Hook: Stop
# Purpose: Suggest session wrap-up before ending

# Check if there are uncommitted changes
if git status --porcelain 2>/dev/null | grep -q '^[MADRCU]'; then
    echo "💾 [session] Uncommitted staged changes detected. Consider committing before ending." >&2
fi

# Check edit count
TRACKER="$HOME/.claude/.edit-count"
if [[ -f "$TRACKER" ]]; then
    COUNT=$(cat "$TRACKER")
    if (( COUNT > 0 )); then
        echo "📝 [session] $COUNT files modified this session. Consider running /handoff to save context." >&2
    fi
    rm -f "$TRACKER"
fi

exit 0
