#!/usr/bin/env bash
set -euo pipefail

# Backup ~/.claude to timestamped directory
CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$HOME/.claude.backup.$(date +%Y%m%d-%H%M%S)"

if [[ ! -d "$CLAUDE_DIR" ]]; then
    echo "No ~/.claude directory found — nothing to backup"
    exit 0
fi

cp -r "$CLAUDE_DIR" "$BACKUP_DIR"
echo "Backup created: $BACKUP_DIR"
echo "Size: $(du -sh "$BACKUP_DIR" | cut -f1)"
