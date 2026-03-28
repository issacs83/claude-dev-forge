#!/bin/bash
# Jun.AI Dashboard — Stop all services
LOG_DIR="/home/issacs/.jun-ai/logs"

echo "[$(date)] Jun.AI stopping..." >> "$LOG_DIR/startup.log"

# Stop PM2 services
pm2 stop all 2>/dev/null
echo "PM2 services stopped"

# Kill Claude sessions
tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^jun-' | while read s; do
    tmux kill-session -t "$s" 2>/dev/null && echo "Killed Claude session: $s"
done

echo "[$(date)] Jun.AI stopped" >> "$LOG_DIR/startup.log"
echo "All Jun.AI services stopped."
