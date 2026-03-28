#!/bin/bash
# Jun.AI Dashboard — Service status check (PM2 based)

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        Jun.AI Service Status         ║"
echo "╠══════════════════════════════════════╣"

# PM2 services
pm2 jlist 2>/dev/null | python3 -c "
import sys,json
apps=json.load(sys.stdin)
for a in apps:
    name=a.get('name','?')
    status=a.get('pm2_env',{}).get('status','?')
    restarts=a.get('pm2_env',{}).get('restart_time',0)
    uptime=a.get('pm2_env',{}).get('pm_uptime',0)
    icon = '●' if status == 'online' else '○'
    print(f'║  {icon} {name:<20s} {status:<10s} ↺{restarts} ║')
" 2>/dev/null

# Claude Sessions
CLAUDE_SESSIONS=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^jun-' | wc -l)
printf "║  Claude Sessions: %-2s active           ║\n" "$CLAUDE_SESSIONS"

echo "╠══════════════════════════════════════╣"
tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^jun-' | while read s; do
    printf "║    ● %-32s ║\n" "$s"
done
echo "╚══════════════════════════════════════╝"
echo ""
