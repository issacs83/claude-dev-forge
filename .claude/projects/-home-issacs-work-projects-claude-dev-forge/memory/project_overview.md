---
name: Project Overview
description: claude-dev-forge is a Claude Code development framework with agents, skills, hooks, rules, and a real-time dashboard
type: project
---

claude-dev-forge: Claude Code 범용 제품 개발 프레임워크
- 43 agents, 33 commands, 19 skills, 12 hooks, 13 rules
- PDLC 12-phase pipeline with auto document generation
- Jun.AI Dashboard (Express + WebSocket) at port 7700, API docs at 7701
- IMPROVEMENT_REQUEST.md contains prioritized bug/feature backlog for dashboard
- Installed to ~/.claude/ via symlinks (install.sh)
- GitHub: issacs83/claude-dev-forge

**Why:** This is the tooling infrastructure for all projects — changes here affect every Claude Code session.
**How to apply:** Treat as shared infrastructure; test changes carefully, avoid breaking existing workflows.
