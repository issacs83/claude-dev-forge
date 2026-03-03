#!/usr/bin/env bash
# Hook: PostToolUse (Bash)
# Purpose: Capture build failure output for analysis

# Read command output/result
OUTPUT=$(cat)

# Check for common build failure patterns
BUILD_FAIL_PATTERNS=(
    'error:'
    'ERROR:'
    'FAILED'
    'Build failed'
    'compilation terminated'
    'do_compile: oe_runmake failed'
    'do_fetch: Fetcher failure'
    'npm ERR!'
    'cargo error'
    'FAILED: CMakeFiles'
)

IS_FAILURE=false
for pattern in "${BUILD_FAIL_PATTERNS[@]}"; do
    if echo "$OUTPUT" | grep -q "$pattern" 2>/dev/null; then
        IS_FAILURE=true
        break
    fi
done

if [[ "$IS_FAILURE" == "true" ]]; then
    # Save last build failure for reference
    LOG_DIR="$HOME/.claude/build-logs"
    mkdir -p "$LOG_DIR"
    echo "$OUTPUT" | tail -100 > "$LOG_DIR/last-failure.log"
    echo "📋 [build] Build failure captured to ~/.claude/build-logs/last-failure.log" >&2
fi

exit 0
