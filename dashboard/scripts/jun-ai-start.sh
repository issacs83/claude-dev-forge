#!/bin/bash
# Jun.AI Dashboard — Auto-start script
# Starts: Dashboard (7700) + API Docs (7701) + Telegram Bridge
# Called by: systemd service or @reboot crontab

DASHBOARD_DIR="/home/issacs/work/claude-dev-forge/dashboard"
LOG_DIR="/home/issacs/.jun-ai/logs"
PID_DIR="/home/issacs/.jun-ai/pids"

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR"

echo "[$(date)] Jun.AI starting..." >> "$LOG_DIR/startup.log"

# --- 1. Dashboard Server (port 7700) ---
if ! lsof -i :7700 -sTCP:LISTEN -t > /dev/null 2>&1; then
    cd "$DASHBOARD_DIR"
    nohup node server.js >> "$LOG_DIR/dashboard.log" 2>&1 &
    echo $! > "$PID_DIR/dashboard.pid"
    echo "[$(date)] Dashboard started (PID: $!)" >> "$LOG_DIR/startup.log"
else
    echo "[$(date)] Dashboard already running on :7700" >> "$LOG_DIR/startup.log"
fi

sleep 2

# --- 2. API Docs Server (port 7701) ---
if ! lsof -i :7701 -sTCP:LISTEN -t > /dev/null 2>&1; then
    cd "$DASHBOARD_DIR"
    nohup node api-docs.js >> "$LOG_DIR/api-docs.log" 2>&1 &
    echo $! > "$PID_DIR/api-docs.pid"
    echo "[$(date)] API Docs started (PID: $!)" >> "$LOG_DIR/startup.log"
else
    echo "[$(date)] API Docs already running on :7701" >> "$LOG_DIR/startup.log"
fi

sleep 1

# --- 3. Telegram Bridge ---
if ! pgrep -f "telegram-bridge.js" > /dev/null 2>&1; then
    cd "$DASHBOARD_DIR"
    nohup node telegram-bridge.js >> "$LOG_DIR/telegram.log" 2>&1 &
    echo $! > "$PID_DIR/telegram.pid"
    echo "[$(date)] Telegram bridge started (PID: $!)" >> "$LOG_DIR/startup.log"
else
    echo "[$(date)] Telegram bridge already running" >> "$LOG_DIR/startup.log"
fi

sleep 2

# --- 4. tmux work 세션 (없으면 생성) ---
if ! tmux has-session -t work 2>/dev/null; then
    tmux new-session -d -s work -n claude
    echo "[$(date)] tmux work session created" >> "$LOG_DIR/startup.log"
else
    echo "[$(date)] tmux work session exists" >> "$LOG_DIR/startup.log"
fi

# --- 5. Verify ---
echo "[$(date)] === Verification ===" >> "$LOG_DIR/startup.log"
echo "Dashboard: $(lsof -i :7700 -sTCP:LISTEN -t 2>/dev/null && echo OK || echo FAIL)" >> "$LOG_DIR/startup.log"
echo "API Docs:  $(lsof -i :7701 -sTCP:LISTEN -t 2>/dev/null && echo OK || echo FAIL)" >> "$LOG_DIR/startup.log"
echo "Telegram:  $(pgrep -f telegram-bridge.js > /dev/null && echo OK || echo FAIL)" >> "$LOG_DIR/startup.log"
echo "tmux:      $(tmux has-session -t work 2>/dev/null && echo OK || echo FAIL)" >> "$LOG_DIR/startup.log"
echo "[$(date)] Jun.AI startup complete" >> "$LOG_DIR/startup.log"
