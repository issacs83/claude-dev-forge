#!/bin/bash
# Jun.AI Dashboard — Service status check

echo "╔══════════════════════════════════════╗"
echo "║        Jun.AI Service Status         ║"
echo "╠══════════════════════════════════════╣"

# Dashboard
if lsof -i :7700 -sTCP:LISTEN -t > /dev/null 2>&1; then
    pid=$(lsof -i :7700 -sTCP:LISTEN -t)
    printf "║  Dashboard (7700)    ● Running %-5s ║\n" "($pid)"
else
    echo "║  Dashboard (7700)    ○ Stopped       ║"
fi

# API Docs
if lsof -i :7701 -sTCP:LISTEN -t > /dev/null 2>&1; then
    pid=$(lsof -i :7701 -sTCP:LISTEN -t)
    printf "║  API Docs  (7701)    ● Running %-5s ║\n" "($pid)"
else
    echo "║  API Docs  (7701)    ○ Stopped       ║"
fi

# Telegram
if pgrep -f "telegram-bridge.js" > /dev/null 2>&1; then
    pid=$(pgrep -f "telegram-bridge.js" | head -1)
    printf "║  Telegram Bridge     ● Running %-5s ║\n" "($pid)"
else
    echo "║  Telegram Bridge     ○ Stopped       ║"
fi

# Claude Sessions (independent tmux sessions)
CLAUDE_SESSIONS=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^jun-' | wc -l)
if [ "$CLAUDE_SESSIONS" -gt 0 ]; then
    printf "║  Claude Sessions     ● %-2s active      ║\n" "$CLAUDE_SESSIONS"
else
    echo "║  Claude Sessions     ○ None          ║"
fi

# Data
STATE_FILE="/home/issacs/work/projects/claude-dev-forge/dashboard/data/state.json"
if [ -f "$STATE_FILE" ]; then
    size=$(du -h "$STATE_FILE" | awk '{print $1}')
    printf "║  State data          ● %-14s ║\n" "$size"
else
    echo "║  State data          ○ Missing       ║"
fi

echo "╠══════════════════════════════════════╣"

# List Claude sessions
if [ "$CLAUDE_SESSIONS" -gt 0 ]; then
    echo "║  Claude Sessions:                    ║"
    tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^jun-' | while read s; do
        printf "║    ● %-32s ║\n" "$s"
    done
fi

echo "╚══════════════════════════════════════╝"
