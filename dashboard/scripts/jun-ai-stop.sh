#!/bin/bash
# Jun.AI Dashboard — Stop all services
PID_DIR="/home/issacs/.jun-ai/pids"
LOG_DIR="/home/issacs/.jun-ai/logs"

echo "[$(date)] Jun.AI stopping..." >> "$LOG_DIR/startup.log"

# Kill by PID files
for f in "$PID_DIR"/*.pid; do
    if [ -f "$f" ]; then
        pid=$(cat "$f")
        kill "$pid" 2>/dev/null && echo "Killed $(basename $f .pid): $pid"
        rm "$f"
    fi
done

# Kill any remaining
kill $(lsof -t -i:7700) 2>/dev/null
kill $(lsof -t -i:7701) 2>/dev/null
pkill -f telegram-bridge.js 2>/dev/null

# Kill all jun- Claude sessions
tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^jun-' | while read s; do
    tmux kill-session -t "$s" 2>/dev/null && echo "Killed Claude session: $s"
done

echo "[$(date)] Jun.AI stopped" >> "$LOG_DIR/startup.log"
echo "All Jun.AI services stopped."
