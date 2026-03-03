---
allowed-tools: ""
description: "Display current forge configuration and status"
---

# /show-setup — Show Current Configuration

You are executing the `/show-setup` command.

## Steps

1. **Check Installation**
   - Read `~/.claude/.forge-meta.json` for version and install info
   - Check if forge directory exists and symlinks resolve

2. **Count Components**
   - Count agents in `~/.claude/agents/*.md`
   - Count commands in `~/.claude/commands/*.md`
   - Count skills in `~/.claude/skills/*/skill.md`
   - Count hooks in `~/.claude/hooks/*.sh`
   - Count rules in `~/.claude/rules/*.md`

3. **Check Project Overlay**
   - Look for `.claude/` in current working directory
   - List project-specific agents, rules, memory, prompts

4. **Check MCP Servers**
   - Read MCP server configuration
   - Report which servers are configured

5. **Display Summary**
   ```
   ╔══════════════════════════════════════╗
   ║  claude-dev-forge vX.Y.Z            ║
   ╠══════════════════════════════════════╣
   ║  Global:                            ║
   ║    Agents:   XX                     ║
   ║    Commands: XX                     ║
   ║    Skills:   XX                     ║
   ║    Hooks:    XX                     ║
   ║    Rules:    XX                     ║
   ║    MCP:      XX servers             ║
   ╠══════════════════════════════════════╣
   ║  Project Overlay:                   ║
   ║    Rules:    XX                     ║
   ║    Agents:   XX                     ║
   ║    Memory:   yes/no                 ║
   ╚══════════════════════════════════════╝
   ```

## Arguments
- None
