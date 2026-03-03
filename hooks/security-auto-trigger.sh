#!/usr/bin/env bash
# Hook: PostToolUse (Edit/Write)
# Purpose: Suggest security review when security-sensitive files are modified

INPUT="${CLAUDE_TOOL_INPUT:-$(cat)}"

# Extract file path from tool input
FILE_PATH=""
if echo "$INPUT" | jq -e '.file_path' &>/dev/null 2>&1; then
    FILE_PATH=$(echo "$INPUT" | jq -r '.file_path')
fi

if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Security-sensitive file patterns
SENSITIVE_PATTERNS=(
    'auth'
    'login'
    'password'
    'credential'
    'token'
    'secret'
    'crypto'
    'encrypt'
    'ssl'
    'tls'
    'certificate'
    'permission'
    'rbac'
    'acl'
    '.env'
    'security'
    'firewall'
    'iptables'
)

BASENAME=$(basename "$FILE_PATH" | tr '[:upper:]' '[:lower:]')
DIRNAME=$(dirname "$FILE_PATH" | tr '[:upper:]' '[:lower:]')

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if [[ "$BASENAME" == *"$pattern"* ]] || [[ "$DIRNAME" == *"$pattern"* ]]; then
        echo "🔒 [security] Security-sensitive file modified: $FILE_PATH — consider running /security-review" >&2
        break
    fi
done

exit 0
