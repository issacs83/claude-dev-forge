#!/usr/bin/env bash
# Hook: PostToolUse (all tools)
# Purpose: Detect and warn about potential secrets in tool output

# Read tool output from stdin
OUTPUT=$(cat)

# Secret patterns to detect
PATTERNS=(
    'AKIA[0-9A-Z]{16}'                          # AWS Access Key
    'sk-[a-zA-Z0-9]{48}'                         # OpenAI/Anthropic API Key
    'ghp_[a-zA-Z0-9]{36}'                        # GitHub PAT
    'gho_[a-zA-Z0-9]{36}'                        # GitHub OAuth
    'glpat-[a-zA-Z0-9_-]{20}'                    # GitLab PAT
    'xoxb-[0-9]{10,}-[a-zA-Z0-9]{24}'           # Slack Bot Token
    'xoxp-[0-9]{10,}-[a-zA-Z0-9]{24}'           # Slack User Token
    '[a-zA-Z0-9_-]*password[a-zA-Z0-9_-]*\s*[:=]\s*["\x27][^"\x27]{8,}' # password assignments
    'BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY'  # Private keys
    'eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}' # JWT tokens
)

FOUND=false
for pattern in "${PATTERNS[@]}"; do
    if echo "$OUTPUT" | grep -qEi "$pattern" 2>/dev/null; then
        FOUND=true
        break
    fi
done

if [[ "$FOUND" == "true" ]]; then
    echo "⚠️  [secret-filter] Potential secret detected in output. Review before sharing." >&2
fi

# Always allow (exit 0) — this is a warning hook, not a blocker
exit 0
