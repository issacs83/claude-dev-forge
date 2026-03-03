#!/usr/bin/env bash
set -euo pipefail

# Validates claude-dev-forge installation
CLAUDE_DIR="$HOME/.claude"
errors=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
err() { echo -e "${RED}[FAIL]${NC} $1"; ((errors++)); }

echo "Validating claude-dev-forge installation..."
echo ""

# Check directories
for dir in agents commands rules hooks skills; do
    if [[ -d "$CLAUDE_DIR/$dir" ]] || [[ -L "$CLAUDE_DIR/$dir" ]]; then
        count=$(find -L "$CLAUDE_DIR/$dir" -maxdepth 2 \( -name "*.md" -o -name "*.sh" \) 2>/dev/null | wc -l)
        ok "$dir/ — $count files"
    else
        err "$dir/ — missing"
    fi
done

# Check settings.json
if [[ -f "$CLAUDE_DIR/settings.json" ]] || [[ -L "$CLAUDE_DIR/settings.json" ]]; then
    if jq empty "$CLAUDE_DIR/settings.json" 2>/dev/null; then
        ok "settings.json — valid JSON"
    else
        err "settings.json — invalid JSON"
    fi
else
    err "settings.json — missing"
fi

# Check hooks are executable
if [[ -d "$CLAUDE_DIR/hooks" ]] || [[ -L "$CLAUDE_DIR/hooks" ]]; then
    while IFS= read -r hook; do
        if [[ -x "$hook" ]]; then
            ok "$(basename "$hook") — executable"
        else
            err "$(basename "$hook") — not executable (run: chmod +x $hook)"
        fi
    done < <(find -L "$CLAUDE_DIR/hooks" -name "*.sh" 2>/dev/null)
fi

# Check symlink targets resolve
for item in "$CLAUDE_DIR"/{agents,commands,rules,hooks,skills,settings.json}; do
    if [[ -L "$item" ]]; then
        target=$(readlink -f "$item" 2>/dev/null || readlink "$item")
        if [[ -e "$target" ]]; then
            ok "$(basename "$item") symlink resolves"
        else
            err "$(basename "$item") symlink broken → $target"
        fi
    fi
done

echo ""
if (( errors > 0 )); then
    echo -e "${RED}Validation failed with $errors error(s)${NC}"
    exit 1
else
    echo -e "${GREEN}All checks passed!${NC}"
fi
