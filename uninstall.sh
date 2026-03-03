#!/usr/bin/env bash
set -euo pipefail

# Uninstall claude-dev-forge
CLAUDE_DIR="$HOME/.claude"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}claude-dev-forge uninstaller${NC}"
echo "This will remove forge symlinks from ~/.claude/"
echo ""
read -rp "Continue? [y/N] " choice
if [[ ! "$choice" =~ ^[Yy] ]]; then
    echo "Cancelled."
    exit 0
fi

# Remove symlinks (only forge-managed ones)
FORGE_DIRS=("agents" "commands" "skills" "hooks" "rules" "scripts")
for dir in "${FORGE_DIRS[@]}"; do
    target="$CLAUDE_DIR/$dir"
    if [[ -L "$target" ]]; then
        rm "$target"
        echo -e "${GREEN}Removed symlink:${NC} $target"
    elif [[ -d "$target" ]]; then
        echo -e "${YELLOW}Skipped (not a symlink):${NC} $target"
    fi
done

# Remove settings.json symlink
if [[ -L "$CLAUDE_DIR/settings.json" ]]; then
    rm "$CLAUDE_DIR/settings.json"
    echo -e "${GREEN}Removed symlink:${NC} settings.json"
fi

# Remove metadata
rm -f "$CLAUDE_DIR/.forge-meta.json"
rm -f "$CLAUDE_DIR/.edit-count"
rm -f "$CLAUDE_DIR/.last-update-check"

echo ""
echo -e "${GREEN}claude-dev-forge uninstalled.${NC}"
echo "Your ~/.claude/ directory is preserved (projects, tasks, memory intact)."
echo ""

# Check for backup
LATEST_BACKUP=$(ls -1d "$HOME"/.claude.backup.* 2>/dev/null | tail -1)
if [[ -n "$LATEST_BACKUP" ]]; then
    echo "To restore previous config: cp -r $LATEST_BACKUP/* $CLAUDE_DIR/"
fi
