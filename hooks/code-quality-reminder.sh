#!/usr/bin/env bash
# Hook: PostToolUse (Edit/Write)
# Purpose: Remind about quality checks after code modifications

INPUT="${CLAUDE_TOOL_INPUT:-$(cat)}"

# Extract file path
FILE_PATH=""
if echo "$INPUT" | jq -e '.file_path' &>/dev/null 2>&1; then
    FILE_PATH=$(echo "$INPUT" | jq -r '.file_path')
fi

if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Track modifications count in this session
TRACKER="$HOME/.claude/.edit-count"
COUNT=0
if [[ -f "$TRACKER" ]]; then
    COUNT=$(cat "$TRACKER")
fi
COUNT=$((COUNT + 1))
echo "$COUNT" > "$TRACKER"

# Remind every 10 edits
if (( COUNT % 10 == 0 )); then
    echo "💡 [quality] $COUNT files modified this session. Consider running /verify-loop before committing." >&2
fi

exit 0
