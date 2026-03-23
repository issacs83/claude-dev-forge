#!/usr/bin/env bash
# Hook: PostToolUse (Edit|Write)
# Purpose: Quick quality check on modified files — warnings only
# Non-blocking: always exits 0

INPUT="${CLAUDE_TOOL_INPUT:-$(cat)}"

# Extract file path (same pattern as code-quality-reminder.sh)
FILE_PATH=""
if echo "$INPUT" | jq -e '.file_path' &>/dev/null 2>&1; then
    FILE_PATH=$(echo "$INPUT" | jq -r '.file_path')
fi

if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
    exit 0
fi

warnings=""

case "$FILE_PATH" in
    *.py)
        # Check for debug prints
        if grep -qn '^\s*print(' "$FILE_PATH" 2>/dev/null; then
            warnings="${warnings}\n   ⚠️  print() found — remove before commit"
        fi
        # Check for breakpoint
        if grep -qn 'breakpoint()' "$FILE_PATH" 2>/dev/null; then
            warnings="${warnings}\n   ⚠️  breakpoint() found — remove before commit"
        fi
        ;;
    *.c|*.cpp|*.h|*.hpp)
        # Check for printf debugging
        if grep -qn '^\s*printf(' "$FILE_PATH" 2>/dev/null; then
            warnings="${warnings}\n   ⚠️  printf() found — remove before commit"
        fi
        # Check for TODO/FIXME
        if grep -qn 'TODO\|FIXME\|HACK\|XXX' "$FILE_PATH" 2>/dev/null; then
            warnings="${warnings}\n   📝 TODO/FIXME marker found — address or document"
        fi
        ;;
    *.js|*.ts|*.jsx|*.tsx)
        # Check for console.log
        if grep -qn 'console\.log' "$FILE_PATH" 2>/dev/null; then
            warnings="${warnings}\n   ⚠️  console.log found — remove before commit"
        fi
        ;;
esac

if [[ -n "$warnings" ]]; then
    echo "🔍 Quality check: $(basename "$FILE_PATH")${warnings}" >&2
fi

exit 0
