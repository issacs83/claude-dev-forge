#!/bin/bash
# Jun.AI Dashboard — Auto-start script (PM2 based)
# Called by: systemd service or @reboot crontab

DASHBOARD_DIR="/home/issacs/work/projects/claude-dev-forge/dashboard"
LOG_DIR="/home/issacs/.jun-ai/logs"
SESSIONS_ROOT="/home/issacs/sessions"

mkdir -p "$LOG_DIR"
echo "[$(date)] Jun.AI starting..." >> "$LOG_DIR/startup.log"

# --- 1. Start all services via PM2 ---
cd "$DASHBOARD_DIR"
pm2 resurrect 2>/dev/null || pm2 start ecosystem.config.js
echo "[$(date)] PM2 services started" >> "$LOG_DIR/startup.log"

sleep 3

# --- 2. Restore Claude sessions from state.json ---
STATE_FILE="$DASHBOARD_DIR/data/state.json"
CLAUDE_CMD="claude --resume --dangerously-skip-permissions"

if [ -f "$STATE_FILE" ]; then
    python3 -c "
import json
with open('$STATE_FILE') as f:
    data = json.load(f)
for p in data.get('projects', []):
    d = p.get('projectDir', '')
    s = p.get('sessionName', '')
    if d and s and p.get('status') == 'active':
        print(f'{s}|{d}')
" 2>/dev/null | while IFS='|' read -r session_name project_dir; do
        if ! tmux has-session -t "$session_name" 2>/dev/null; then
            if [ -d "$project_dir" ]; then
                tmux new-session -d -s "$session_name" -c "$project_dir" "$CLAUDE_CMD"
                echo "[$(date)] Claude session created: $session_name → $project_dir" >> "$LOG_DIR/startup.log"
                sleep 2
            fi
        else
            echo "[$(date)] Claude session exists: $session_name" >> "$LOG_DIR/startup.log"
        fi
    done
fi

# --- 3. Main bot session (claude-dev-forge + telegram plugin) ---
MAIN_SESSION="JunAIBot"
MAIN_DIR="/home/issacs/work/projects/claude-dev-forge"
MAIN_CMD="claude --resume --dangerously-skip-permissions --channels plugin:telegram@claude-plugins-official"
if ! tmux has-session -t "$MAIN_SESSION" 2>/dev/null; then
    tmux new-session -d -s "$MAIN_SESSION" -c "$MAIN_DIR" "$MAIN_CMD"
    echo "[$(date)] Main bot session created: $MAIN_SESSION" >> "$LOG_DIR/startup.log"
else
    echo "[$(date)] Main bot session exists: $MAIN_SESSION" >> "$LOG_DIR/startup.log"
fi

# --- 4. Verify ---
echo "[$(date)] === Verification ===" >> "$LOG_DIR/startup.log"
pm2 status >> "$LOG_DIR/startup.log" 2>&1
CLAUDE_SESSIONS=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^jun-' | wc -l)
echo "Claude sessions: $CLAUDE_SESSIONS" >> "$LOG_DIR/startup.log"
echo "[$(date)] Jun.AI startup complete" >> "$LOG_DIR/startup.log"
