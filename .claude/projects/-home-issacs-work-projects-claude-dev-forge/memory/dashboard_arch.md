---
name: Dashboard Architecture
description: Jun.AI dashboard — PM2 managed, independent sessions, approval system, xterm terminal
type: project
---

## Tech Stack
- Backend: Express.js + ws (WebSocket) + node-pty (terminal)
- Frontend: Vanilla JS + xterm.js + CSS
- Process: PM2 (dashboard + telegram-bridge + api-docs)
- State: JSON file persistence with backup rotation

## Architecture (2026-03-28)
```
PM2 (systemd)
  ├── jun-dashboard (7700)
  ├── jun-telegram (@JunDash_bot bridge)
  └── jun-api-docs (7701)

tmux Sessions (crontab @reboot)
  ├── jun-Admin — 시스템 관리자
  ├── jun-SmartScorev2 — 프로젝트 팀장
  └── jun-JunAIDashboard — 프로젝트 팀장

/home/issacs/sessions/
  ├── Admin/
  ├── SmartScorev2/
  └── JunAIDashboard/
```

## Key Features
- 결재 시스템 (approval/approve/reject API + 텔레그램 인라인 버튼)
- xterm.js 웹 터미널 (WebSocket /ws/terminal + node-pty + tmux attach)
- 팀장 프로토콜 (templates/director-claude-md.md — 10개 섹션)
- 모바일 하단 탭바 (Board/Terminal/Agents/Docs)
- Android 터치 드래그 (400ms long-press)
- 채팅 알림 (아이콘 깜빡임 + 소리 + 텔레그램 푸시)
- md→docx 자동 변환
- 30초 Claude 세션 멈춤 감지 + auto-Enter

## Known Issues
- 텔레그램 bridge: 네트워크 불안정 시 크래시 (PM2 자동 재시작으로 대응)
- Health check: done 태스크 agent_start 차단으로 승인 루프 해결됨

**Why:** Dashboard is the central hub for all PDLC agent activities.
**How to apply:** Admin 세션에서 대시보드 관리. PM2 명령어로 서비스 관리.
