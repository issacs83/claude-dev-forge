#!/usr/bin/env bash
# Hook: PreToolUse (Bash)
# Purpose: Block dangerous commands before execution
# Exit 0 = allow, Exit 2 = block

# The command is passed via CLAUDE_TOOL_INPUT env or stdin
COMMAND="${CLAUDE_TOOL_INPUT:-$(cat)}"

# Extract the actual command from JSON if needed
if echo "$COMMAND" | jq -e '.command' &>/dev/null 2>&1; then
    COMMAND=$(echo "$COMMAND" | jq -r '.command')
fi

# Dangerous patterns to block
BLOCKED_PATTERNS=(
    'rm -rf /\s*$'
    'rm -rf /\*'
    'rm -rf ~\s*$'
    'rm -rf \$HOME\s*$'
    'mkfs\.'
    'dd if=.* of=/dev/sd'
    ':(){:|:&};:'           # Fork bomb
    'chmod -R 777 /'
    '> /dev/sda'
    'mv /* /dev/null'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qE "$pattern" 2>/dev/null; then
        echo "🛑 [command-guard] Blocked dangerous command: $COMMAND" >&2
        exit 2  # Block execution
    fi
done

# Warn about pipe-to-shell patterns
if echo "$COMMAND" | grep -qE '(curl|wget).*\|\s*(bash|sh|zsh)' 2>/dev/null; then
    echo "⚠️  [command-guard] Pipe-to-shell detected. Review the command carefully." >&2
    # Allow but warn — user will be prompted by Claude Code anyway
fi

# Allow all other commands
exit 0
