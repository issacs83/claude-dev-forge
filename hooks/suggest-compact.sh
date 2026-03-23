#!/usr/bin/env bash
# Hook: PostToolUse (Edit|Write)
# Purpose: Track edit count and suggest strategic compact at logical boundaries
# Non-blocking: always exits 0

# Shared with cost-tracker.sh (reads and resets this counter at session end)
TRACKER="$HOME/.claude/.compact-tracker"
COMPACT_THRESHOLD="${COMPACT_THRESHOLD:-50}"

# Initialize tracker if not exists
if [[ ! -f "$TRACKER" ]]; then
    echo "0" > "$TRACKER"
fi

# Increment count
count=$(cat "$TRACKER" 2>/dev/null || echo "0")
count=$((count + 1))
echo "$count" > "$TRACKER"

# Check threshold
if (( count == COMPACT_THRESHOLD )); then
    echo "📦 Tool call count reached ${COMPACT_THRESHOLD}. Consider /compact at a logical boundary." >&2
    echo "   Save key context to MEMORY.md or TODO before compacting." >&2
elif (( count > COMPACT_THRESHOLD && count % 25 == 0 )); then
    echo "⚠️  Tool calls: ${count}. Context may be getting heavy. Consider /compact." >&2
fi

exit 0
