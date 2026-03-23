#!/usr/bin/env bash
# Hook: Stop
# Purpose: Report session statistics at session end
# Non-blocking: always exits 0

# Shared with suggest-compact.sh (increments this counter on each Edit/Write)
TRACKER="$HOME/.claude/.compact-tracker"
STATS="$HOME/.claude/.session-stats"

# Read compact tracker (tool call count)
tool_calls=$(cat "$TRACKER" 2>/dev/null || echo "0")

# Read session start time if tracked
start_time=$(cat "$STATS" 2>/dev/null || echo "")

if (( tool_calls > 0 )); then
    echo "" >&2
    echo "📊 Session Summary:" >&2
    echo "   Tool calls: ${tool_calls}" >&2
    if [[ -n "$start_time" ]]; then
        elapsed=$(( $(date +%s) - start_time ))
        minutes=$((elapsed / 60))
        echo "   Duration: ~${minutes} min" >&2
    fi
    echo "" >&2
fi

# Reset trackers for next session
echo "0" > "$TRACKER"
date +%s > "$STATS"

exit 0
