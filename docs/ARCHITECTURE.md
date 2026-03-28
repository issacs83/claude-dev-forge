# claude-dev-forge Architecture

## Two-Tier Design

```
┌─────────────────────────────────────────────┐
│              Global Tier (~/.claude/)         │
│  Installed by: install.sh                    │
│  Updated by:   git pull (symlinks)           │
│                                              │
│  agents/     43 agent definitions            │
│  commands/   33 slash commands               │
│  skills/     19 multi-step workflows         │
│  hooks/      12 event-driven scripts         │
│  rules/      13 coding standards             │
│  dashboard/  Jun.AI web app            │
│  settings.json   permissions + hook bindings │
│  mcp-servers.json   5 MCP servers            │
└───────────────────┬─────────────────────────┘
                    │ extends
┌───────────────────▼─────────────────────────┐
│           Project Tier (.claude/)            │
│  Created by: /init-project                   │
│  Scope:      per-project customization       │
│                                              │
│  rules/     project-specific coding rules    │
│  agents/    project-specific agents          │
│  memory/    project knowledge base           │
│  prompts/   system prompt context            │
└─────────────────────────────────────────────┘
```

## Agent Architecture (41 Agents)

```
User (Natural Language Input)
  │
  ▼
┌──────────────────────────────────────────────────────┐
│              project-director (Team Lead)             │
│         Requirement Interpretation → Auto Dispatch    │
│                     │                                 │
│              env-provisioner (Support)                │
│         Dependency Check → Auto Install               │
└──┬──────┬────────┬────────┬────────┬────────┬────────┘
   │      │        │        │        │        │
   ▼      ▼        ▼        ▼        ▼        ▼
┌──────┐┌──────┐┌──────┐┌───────┐┌──────┐┌──────────┐
│Mgmt  ││Rsrch ││AI/ML ││GPU/NPU││PDLC  ││Doc       │
│ (2)  ││ (2)  ││ (5)  ││  (3)  ││ (3)  ││Writers(4)│
└──────┘└──────┘└──────┘└───────┘└──────┘└──────────┘
┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│Process(7) ││Domain(11)││Test/Eval ││Merged(2) │
│           ││          ││   (2)    ││          │
└──────────┘└──────────┘└──────────┘└──────────┘
```

### Agent Categories

| Category | Count | Agents | Model |
|----------|-------|--------|-------|
| Management | 2 | project-director, env-provisioner | Opus/Sonnet |
| Research | 2 | paper-patent-researcher, algorithm-researcher | Opus |
| AI/ML | 5 | data-engineer, labeling-manager, labeling-reviewer, ai-trainer, mlops-engineer | Mixed |
| GPU/NPU | 3 | cuda-engineer, npu-engineer, inference-optimizer | Opus/Sonnet |
| PDLC | 3 | voc-researcher, ux-designer, marketing-strategist | Opus |
| Document | 4 | report-writer, presentation-writer, hwp-writer, spreadsheet-writer | Mixed |
| Test/Eval | 2 | e2e-tester, evaluator | Sonnet/Opus |
| Process | 7 | planner, architect, code-reviewer, security-reviewer, tdd-guide, build-error-resolver, verify-agent | Mixed |
| Domain | 11 | bsp, firmware, circuit, hardware, graphics, sdk, web, devops, maintenance, product-strategist, regulatory | Mixed |
| Merged | 2 | doc-manager, qa-engineer | Sonnet |

## PDLC Pipeline (12 Phases)

```
Phase 0: Prior Research ──→ paper-patent-researcher
Phase 1: VOC ──→ voc-researcher
Phase 2: Market Research ──→ product-strategist
Phase 3: Planning & Design ──→ ux-designer + marketing-strategist
Phase 4: Detailed Planning ──→ planner + domain agents
Phase 5: Architecture ──→ architect + planner
Phase 6: Part Design ──→ domain agents (fan-out)
Phase 7: Detailed Design ──→ domain agents + security-reviewer
Phase 8: Implementation ──→ domain agents + tdd-guide + verify-agent
Phase 9: Testing ──→ qa-engineer + e2e-tester
Phase 10: Verification ──→ regulatory-specialist + qa-engineer
Phase 11: Evaluation ──→ evaluator
         ↑                            │
         └── Debug Loop (if Grade<B) ──┘
```

## Document Production Flow

```
Analysis/Design/Test Result (Markdown)
         │
         ▼
┌─────────────────────────────────┐
│      doc-manager (router)       │
│  Content analysis → Format      │
│  decision → Dispatch            │
└────────┬──────┬──────┬─────┬───┘
         │      │      │     │
    ┌────▼─┐ ┌─▼──┐ ┌─▼──┐ ┌▼────┐
    │report│ │ppt │ │hwp │ │excel│
    │writer│ │wrtr│ │wrtr│ │wrtr │
    └──┬───┘ └─┬──┘ └─┬──┘ └─┬───┘
    .docx   .pptx   .hwpx  .xlsx
```

## Dashboard Architecture

```
Claude Code (Terminal)
  │
  ├── project-director dispatches agents
  │   └── POST /api/events → dashboard server
  │
  ▼
Dashboard Server (Node.js, port 7700)
  ├── REST API: /api/status, /api/agents, /api/tasks
  ├── WebSocket: real-time push to browser
  └── Static: Jun.AI Kanban Board UI
        │
        ▼
  Browser (localhost:7700)
  ├── 5-column Kanban: To Do → Claimed → In Progress → Review → Done
  ├── PDLC Phase Progress Bar
  ├── Agent Monitor Panel
  └── Document Output Tracker
```

## Hook Event Flow

```
SessionStart ─→ context-sync-suggest
              ─→ forge-update-check

PreToolUse(Bash) ─→ remote-command-guard ─→ BLOCK or ALLOW

PostToolUse(Bash) ─→ output-secret-filter
                   ─→ build-log-capture

PostToolUse(Edit/Write) ─→ code-quality-reminder
                         ─→ security-auto-trigger
                         ─→ suggest-compact
                         ─→ quality-gate

Stop ─→ session-wrap-suggest
     ─→ cost-tracker

TaskCompleted ─→ task-completed
```

## Install Flow

```
install.sh
  │
  ├─ detect_platform (macOS/Linux/WSL)
  ├─ check_deps (node 18+, git, jq)
  ├─ backup_existing (~/.claude → backup)
  ├─ create_dirs
  ├─ install_content (symlink or copy)
  │   ├─ agents/ → ~/.claude/agents (41)
  │   ├─ commands/ → ~/.claude/commands (33)
  │   ├─ skills/ → ~/.claude/skills (10)
  │   ├─ hooks/ → ~/.claude/hooks (9)
  │   ├─ rules/ → ~/.claude/rules (9)
  │   ├─ dashboard/ → ~/.claude/dashboard
  │   └─ settings.json → ~/.claude/settings.json
  ├─ install_mcp (optional)
  ├─ install_aliases (optional)
  ├─ validate
  └─ write_meta (.forge-meta.json)
```
