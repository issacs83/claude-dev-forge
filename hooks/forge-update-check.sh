#!/usr/bin/env bash
# Hook: SessionStart
# Purpose: Check if forge has updates available

META="$HOME/.claude/.forge-meta.json"
if [[ ! -f "$META" ]]; then
    exit 0
fi

FORGE_DIR=$(jq -r '.forge_dir // empty' "$META" 2>/dev/null)
if [[ -z "$FORGE_DIR" ]] || [[ ! -d "$FORGE_DIR/.git" ]]; then
    exit 0
fi

# Only check once per day
LAST_CHECK="$HOME/.claude/.last-update-check"
if [[ -f "$LAST_CHECK" ]]; then
    LAST=$(cat "$LAST_CHECK")
    NOW=$(date +%Y%m%d)
    if [[ "$LAST" == "$NOW" ]]; then
        exit 0
    fi
fi

# Quick fetch check (timeout 5s)
cd "$FORGE_DIR" || exit 0
BEHIND=$(timeout 5 git fetch --dry-run 2>&1 | wc -l)
date +%Y%m%d > "$LAST_CHECK"

if (( BEHIND > 0 )); then
    echo "🔄 [forge] Updates available. Run: cd $FORGE_DIR && git pull" >&2
fi

exit 0
