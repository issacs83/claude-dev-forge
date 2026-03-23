# claude-dev-forge Architecture

## Two-Tier Design

```
┌─────────────────────────────────────────────┐
│              Global Tier (~/.claude/)         │
│  Installed by: install.sh                    │
│  Updated by:   git pull (symlinks)           │
│                                              │
│  agents/     21 agent definitions            │
│  commands/   24 slash commands               │
│  skills/     17 multi-step workflows         │
│  hooks/      12 event-driven scripts         │
│  rules/      12 coding standards             │
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

## Agent Architecture

```
User
  │
  ▼
Orchestrator (Main Claude)
  │
  ├── Process Agents (7) ── SW development workflow
  │   ├── planner        (plan before code)
  │   ├── architect      (read-only analysis)
  │   ├── code-reviewer  (quality gates)
  │   ├── security-reviewer (security audit)
  │   ├── tdd-guide      (test-first dev)
  │   ├── build-error-resolver (fix builds)
  │   └── verify-agent   (pipeline runner)
  │
  ├── Domain Agents (12) ── specialized expertise
  │   ├── bsp-engineer, firmware-engineer
  │   ├── circuit-engineer, hardware-engineer
  │   ├── algorithm-researcher, graphics-engineer
  │   ├── sdk-developer, web-developer
  │   ├── devops-engineer, maintenance-engineer
  │   └── product-strategist, regulatory-specialist
  │
  └── Merged Agents (2) ── combined roles
      ├── doc-manager    (writing + sync)
      └── qa-engineer    (strategy + testing)
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
  │   ├─ agents/ → ~/.claude/agents
  │   ├─ commands/ → ~/.claude/commands
  │   ├─ skills/ → ~/.claude/skills
  │   ├─ hooks/ → ~/.claude/hooks
  │   ├─ rules/ → ~/.claude/rules
  │   └─ settings.json → ~/.claude/settings.json
  ├─ install_mcp (optional)
  ├─ install_aliases (optional)
  ├─ validate
  └─ write_meta (.forge-meta.json)
```
