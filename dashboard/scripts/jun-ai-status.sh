#!/bin/bash
# Jun.AI Dashboard — Service status check

echo "╔══════════════════════════════════════╗"
echo "║        Jun.AI Service Status         ║"
echo "╠══════════════════════════════════════╣"

# Dashboard
if lsof -i :7700 -sTCP:LISTEN -t > /dev/null 2>&1; then
    pid=$(lsof -i :7700 -sTCP:LISTEN -t)
    echo "║  Dashboard (7700)    ● Running ($pid) ║"
else
    echo "║  Dashboard (7700)    ○ Stopped       ║"
fi

# API Docs
if lsof -i :7701 -sTCP:LISTEN -t > /dev/null 2>&1; then
    pid=$(lsof -i :7701 -sTCP:LISTEN -t)
    echo "║  API Docs  (7701)    ● Running ($pid) ║"
else
    echo "║  API Docs  (7701)    ○ Stopped       ║"
fi

# Telegram
if pgrep -f "telegram-bridge.js" > /dev/null 2>&1; then
    pid=$(pgrep -f "telegram-bridge.js" | head -1)
    echo "║  Telegram Bridge     ● Running ($pid) ║"
else
    echo "║  Telegram Bridge     ○ Stopped       ║"
fi

# tmux
if tmux has-session -t work 2>/dev/null; then
    wins=$(tmux list-windows -t work 2>/dev/null | wc -l)
    echo "║  tmux (work)         ● ${wins} windows       ║"
else
    echo "║  tmux (work)         ○ No session    ║"
fi

# Data
if [ -f "/home/issacs/work/claude-dev-forge/dashboard/data/state.json" ]; then
    size=$(du -h /home/issacs/work/claude-dev-forge/dashboard/data/state.json | awk '{print $1}')
    echo "║  State data          ● ${size}           ║"
else
    echo "║  State data          ○ Missing       ║"
fi

echo "╚══════════════════════════════════════╝"
